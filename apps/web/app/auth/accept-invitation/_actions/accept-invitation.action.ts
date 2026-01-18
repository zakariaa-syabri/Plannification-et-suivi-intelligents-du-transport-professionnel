'use server';

/**
 * Server Action: Accepter une invitation et créer un compte
 * 1. Valide l'invitation
 * 2. Crée un utilisateur Supabase Auth
 * 3. Crée le user_profile
 * 4. Crée l'organization_member
 * 5. Marque l'invitation comme acceptée
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';

interface AcceptInvitationParams {
  token: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface AcceptInvitationResult {
  success: boolean;
  message?: string;
  error?: string;
  organizationName?: string;
}

export async function acceptInvitationAction(
  params: AcceptInvitationParams
): Promise<AcceptInvitationResult> {
  try {
    console.log('🔵 [ACTION] acceptInvitationAction appelée avec token:', params.token.substring(0, 8) + '...');

    const supabase = getSupabaseServerClient();

    // ============================================
    // 1. VALIDER L'INVITATION
    // ============================================
    console.log('🔍 [ACTION] Étape 1: Validation de l\'invitation');

    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*, organizations(name, id)')
      .eq('token', params.token)
      .eq('status', 'pending')
      .maybeSingle();

    if (invitationError) {
      console.error('❌ [ACTION] Erreur lecture invitation:', invitationError);
      return {
        success: false,
        error: 'Erreur lors de la vérification de l\'invitation',
      };
    }

    if (!invitation) {
      console.warn('⚠️ [ACTION] Invitation non trouvée ou expirée');
      return {
        success: false,
        error: 'Invitation non valide ou expirée',
      };
    }

    // Vérifier l'expiration
    if (new Date(invitation.expires_at) < new Date()) {
      console.warn('⚠️ [ACTION] Invitation expirée');
      return {
        success: false,
        error: 'Cette invitation a expiré',
      };
    }

    // Vérifier que l'email correspond
    if (invitation.email !== params.email) {
      console.warn('⚠️ [ACTION] Email ne correspond pas');
      return {
        success: false,
        error: 'L\'email ne correspond pas à l\'invitation',
      };
    }

    console.log('✅ [ACTION] Invitation valide:', {
      id: invitation.id,
      organization: invitation.organizations?.name,
      userType: invitation.user_type,
    });

    // ============================================
    // 2. CRÉER L'UTILISATEUR SUPABASE AUTH
    // ============================================
    console.log('🔍 [ACTION] Étape 2: Création du compte Supabase Auth');

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true, // Confirmer l'email automatiquement
    });

    if (authError || !authData.user) {
      console.error('❌ [ACTION] Erreur création utilisateur auth:', authError);
      return {
        success: false,
        error: authError?.message || 'Erreur lors de la création du compte',
      };
    }

    const userId = authData.user.id;
    console.log('✅ [ACTION] Utilisateur auth créé:', userId);

    // ============================================
    // 3. CRÉER LE USER_PROFILE
    // ============================================
    console.log('🔍 [ACTION] Étape 3: Création du user_profile');

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        organization_id: invitation.organization_id,
        email: params.email,
        first_name: params.firstName || null,
        last_name: params.lastName || null,
        display_name: params.firstName
          ? `${params.firstName}${params.lastName ? ' ' + params.lastName : ''}`
          : params.email,
        phone: invitation.phone || null,
        user_type: invitation.user_type || 'staff',
        is_active: true,
      })
      .select('id')
      .single();

    if (profileError || !profile) {
      console.error('❌ [ACTION] Erreur création user_profile:', profileError);
      // Nettoyer l'utilisateur auth créé
      await supabase.auth.admin.deleteUser(userId);
      return {
        success: false,
        error: profileError?.message || 'Erreur lors de la création du profil',
      };
    }

    console.log('✅ [ACTION] Profil utilisateur créé:', profile.id);

    // ============================================
    // 4. CRÉER L'ORGANIZATION_MEMBER
    // ============================================
    console.log('🔍 [ACTION] Étape 4: Ajout à l\'organization_members');

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: invitation.organization_id,
        role: invitation.role || 'member',
        user_type: invitation.user_type || 'staff',
        approved: true,
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('❌ [ACTION] Erreur ajout organization_member:', memberError);
      // Nettoyer les données créées
      await supabase.from('user_profiles').delete().eq('id', profile.id);
      await supabase.auth.admin.deleteUser(userId);
      return {
        success: false,
        error: memberError.message || 'Erreur lors de l\'ajout à l\'organisation',
      };
    }

    console.log('✅ [ACTION] Membre ajouté à l\'organisation');

    // ============================================
    // 5. MARQUER L'INVITATION COMME ACCEPTÉE
    // ============================================
    console.log('🔍 [ACTION] Étape 5: Marquage de l\'invitation comme acceptée');

    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.warn('⚠️ [ACTION] Erreur mise à jour invitation (non-bloquant):', updateError);
      // On continue même si c'est en erreur
    }

    console.log('✅ [ACTION] Invitation marquée comme acceptée');

    // ============================================
    // SUCCÈS!
    // ============================================
    const successResult: AcceptInvitationResult = {
      success: true,
      message: 'Compte créé avec succès!',
      organizationName: invitation.organizations?.name,
    };

    console.log('✅ [ACTION] Succès complet:', successResult);
    return successResult;
  } catch (error) {
    console.error('❌ [ACTION] Exception:', error);
    const errorResult: AcceptInvitationResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
    console.error('❌ [ACTION] Retour d\'erreur:', errorResult);
    return errorResult;
  }
}
