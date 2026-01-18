'use server';

/**
 * Server Action: Inviter un membre dans l'organisation
 * Crée une invitation pour un nouvel utilisateur
 */

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getCurrentOrganization } from '~/lib/organizations/server/get-current-organization';

interface InviteMemberParams {
  email: string;
  phone?: string;
  user_type: string;
}

interface InviteMemberResult {
  success: boolean;
  invitation?: {
    id: string;
    email: string;
    token: string;
    invitationLink: string;
  };
  error?: string;
}

export async function inviteMemberAction(
  params: InviteMemberParams
): Promise<InviteMemberResult> {
  try {
    console.log('🔵 [ACTION] inviteMemberAction appelée avec:', {
      email: params.email,
      user_type: params.user_type,
    });

    const supabase = getSupabaseServerClient();

    // Vérifier que l'utilisateur est authentifié
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('⚠️ [ACTION] Non authentifié');
      return {
        success: false,
        error: 'Vous devez être authentifié',
      };
    }

    console.log('👤 [ACTION] User:', { id: user.id, email: user.email });

    // Récupérer l'organisation courante
    const organization = await getCurrentOrganization();

    if (!organization) {
      console.warn('⚠️ [ACTION] Pas d\'organisation');
      return {
        success: false,
        error: 'Vous devez créer une organisation d\'abord',
      };
    }

    console.log('🏢 [ACTION] Organization:', { id: organization.id, name: organization.name });

    // Vérifier que l'utilisateur est admin/owner
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      console.warn('⚠️ [ACTION] Erreur vérification membership:', membershipError);
    }

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      console.warn('⚠️ [ACTION] Pas autorisé à inviter des membres');
      return {
        success: false,
        error: 'Vous n\'avez pas la permission d\'inviter des membres',
      };
    }

    console.log('✅ [ACTION] Permission vérifiée');

    // Vérifier que l'email n'a pas déjà une invitation en attente
    const { data: existingInvitation, error: invitationCheckError } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', params.email)
      .eq('organization_id', organization.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (invitationCheckError) {
      console.warn('⚠️ [ACTION] Erreur vérification invitation existante:', invitationCheckError);
    }

    if (existingInvitation) {
      console.warn('⚠️ [ACTION] Invitation déjà en attente pour cet email');
      return {
        success: false,
        error: 'Une invitation est déjà en attente pour cet email',
      };
    }

    // Vérifier que l'email n'est pas déjà membre
    const { data: existingMember } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', params.email)
      .eq('organization_id', organization.id)
      .maybeSingle();

    if (existingMember) {
      console.warn('⚠️ [ACTION] Utilisateur déjà membre');
      return {
        success: false,
        error: 'Cet utilisateur est déjà membre de l\'organisation',
      };
    }

    // Créer l'invitation
    console.log('📝 [ACTION] Création invitation...');
    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert({
        email: params.email,
        phone: params.phone || null,
        role: 'member',
        user_type: params.user_type,
        status: 'pending',
        organization_id: organization.id,
        invited_by: user.id,
        // Expire dans 7 jours
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id, email, token')
      .single();

    console.log('✅ [ACTION] Résultat insertion:', { invitation, insertError });

    if (insertError || !invitation) {
      console.error('❌ [ACTION] Erreur création invitation:', insertError);
      return {
        success: false,
        error: insertError?.message || 'Erreur lors de la création de l\'invitation',
      };
    }

    console.log('✅ [ACTION] Invitation créée:', invitation);

    // Générer le lien d'invitation
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/auth/accept-invitation?token=${invitation.token}`;

    const successResult: InviteMemberResult = {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        token: invitation.token,
        invitationLink,
      },
    };

    console.log('✅ [ACTION] Retour de succès avec lien:', invitationLink);
    return successResult;
  } catch (error) {
    console.error('❌ [ACTION] Exception:', error);
    const errorResult: InviteMemberResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
    console.error('❌ [ACTION] Retour d\'erreur:', errorResult);
    return errorResult;
  }
}
