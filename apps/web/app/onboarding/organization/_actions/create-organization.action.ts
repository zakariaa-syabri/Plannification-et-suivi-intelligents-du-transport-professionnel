'use server';

/**
 * Server Action : Créer une organisation
 * Crée une nouvelle organisation (mode universel, sans domaine prédéfini)
 */

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

interface CreateOrganizationParams {
  owner_id: string;
  name: string;
  slug: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
}

interface CreateOrganizationResult {
  success: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
}

export async function createOrganizationAction(
  params: CreateOrganizationParams
): Promise<CreateOrganizationResult> {
  try {
    console.log('🔵 [ACTION] createOrganizationAction appelée avec:', params);

    const supabase = getSupabaseServerClient();

    // Vérifier que l'utilisateur est authentifié
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('👤 [ACTION] User:', { id: user?.id, email: user?.email });

    if (!user || user.id !== params.owner_id) {
      console.warn('⚠️ [ACTION] Non autorisé - user mismatch');
      return {
        success: false,
        error: 'Non autorisé',
      };
    }

    // Vérifier que l'utilisateur n'a pas déjà une organisation approuvée
    console.log('🔍 [ACTION] Vérification membership existant...');
    const { data: existingMembership, error: membershipError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('approved', true)
      .maybeSingle();

    if (membershipError) {
      console.warn('⚠️ [ACTION] Erreur vérification membership:', membershipError);
    }

    if (existingMembership) {
      console.warn('⚠️ [ACTION] User a déjà une organisation');
      return {
        success: false,
        error: 'Vous avez déjà une organisation',
      };
    }

    // Générer un slug unique basé sur l'email de l'utilisateur + UUID court
    // Cela garantit l'unicité sans dépendre de vérifications de base de données
    console.log('🔍 [ACTION] Génération du slug unique...');

    const emailPrefix = user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const uniqueSuffix = user.id?.substring(0, 8) || Math.random().toString(36).substring(2, 8);
    const finalSlug = `${emailPrefix}-${uniqueSuffix}`;

    console.log(`✅ [ACTION] Slug généré: "${finalSlug}" (basé sur email + user ID)`)

    // Créer l'organisation (mode universel, sans domaine)
    console.log('📝 [ACTION] Insertion organisation avec slug:', finalSlug);
    const { data: organization, error: insertError } = await supabase
      .from('organizations')
      .insert({
        owner_id: params.owner_id,
        name: params.name,
        slug: finalSlug,
        domain_type: 'custom',
        domain_config: {},
        description: params.description || null,
        contact_email: params.contact_email || null,
        contact_phone: params.contact_phone || null,
        address: params.address || null,
        city: params.city || null,
        postal_code: params.postal_code || null,
        status: 'active',
      })
      .select('id, name, slug')
      .single();

    console.log('✅ [ACTION] Résultat insertion:', { organization, insertError });

    if (insertError || !organization) {
      console.error('❌ [ACTION] Erreur insertion organisation:', insertError);
      return {
        success: false,
        error: insertError?.message || 'Erreur lors de la création de l\'organisation',
      };
    }

    console.log('✅ [ACTION] Organisation créée:', organization);

    // ============================================
    // CRÉER LE USER_PROFILE AVEC ORGANIZATION_ID
    // ============================================
    console.log('🔍 [ACTION] Création/Vérification du user_profile...');

    // Vérifier si le profil existe
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id, organization_id')
      .eq('user_id', params.owner_id)
      .maybeSingle();

    console.log('Profil existant:', existingProfile);

    if (existingProfile) {
      // Le profil existe, le mettre à jour TOUJOURS pour garantir organization_id et user_type=admin
      console.log('📝 [ACTION] Mise à jour du profil avec organization_id et user_type=admin...');
      const { error: updateProfileError } = await supabase
        .from('user_profiles')
        .update({
          organization_id: organization.id,
          user_type: 'admin',
          is_active: true,
        })
        .eq('user_id', params.owner_id);

      if (updateProfileError) {
        console.error('❌ [ACTION] Erreur mise à jour profil:', updateProfileError);
      } else {
        console.log('✅ [ACTION] Profil mis à jour avec admin');
      }
    } else {
      // Créer le profil
      console.log('📝 [ACTION] Création du user_profile avec organization_id...');
      const { data: newProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: params.owner_id,
          organization_id: organization.id,
          display_name: user.email || 'Utilisateur',
          user_type: 'admin',
          is_active: true,
          notification_preferences: {
            email: true,
            push: true,
            sms: false,
          },
          language: 'fr',
          timezone: 'Europe/Paris',
        })
        .select('id')
        .single();

      if (profileError) {
        console.error('❌ [ACTION] Erreur création user_profile:', profileError);
        return {
          success: false,
          error: 'Erreur création du profil utilisateur',
        };
      } else {
        console.log('✅ [ACTION] User profile créé:', newProfile.id);
      }
    }

    // ============================================
    // CRÉER LE MEMBER OWNER EXPLICITEMENT
    // ============================================
    console.log('📝 [ACTION] Création du member owner...');

    // Ne pas compter sur le trigger - créer explicitement le membership
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: params.owner_id,
        role: 'owner',
        user_type: 'admin',
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: params.owner_id,
        joined_at: new Date().toISOString(),
      })
      .select('id, role, user_type, approved')
      .single();

    if (memberError) {
      // Si le member existe déjà (créé par le trigger), le mettre à jour
      if (memberError.code === '23505') {
        console.log('⚠️ [ACTION] Member existe déjà (trigger), mise à jour...');
        const { data: updatedMember, error: updateError } = await supabase
          .from('organization_members')
          .update({
            role: 'owner',
            user_type: 'admin',
            approved: true,
            approved_at: new Date().toISOString(),
            approved_by: params.owner_id,
          })
          .eq('organization_id', organization.id)
          .eq('user_id', params.owner_id)
          .select('id, role, user_type, approved')
          .single();

        if (updateError) {
          console.error('❌ [ACTION] Erreur mise à jour member:', updateError);
          return {
            success: false,
            error: 'Erreur mise à jour du membership',
          };
        }

        console.log('✅ [ACTION] Member mis à jour:', updatedMember);
      } else {
        console.error('❌ [ACTION] Erreur création member:', memberError);
        return {
          success: false,
          error: 'Erreur création du membership',
        };
      }
    } else {
      console.log('✅ [ACTION] Member créé:', {
        role: memberData.role,
        user_type: memberData.user_type,
        approved: memberData.approved,
      });
    }

    console.log('🔄 [ACTION] Revalidation complète des caches...');
    // Revalider tous les chemins pour forcer la mise à jour du serveur
    revalidatePath('/', 'layout');
    revalidatePath('/home', 'layout');
    revalidatePath('/home', 'page');
    revalidatePath('/home/settings', 'layout');
    revalidatePath('/home/settings/configuration', 'page');
    revalidatePath('/onboarding', 'layout');
    console.log('✅ [ACTION] Caches revalidées');

    const successResult: CreateOrganizationResult = {
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    };

    console.log('✅ [ACTION] Retour de succès:', successResult);
    return successResult;
  } catch (error) {
    console.error('❌ [ACTION] Exception:', error);
    const errorResult: CreateOrganizationResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
    };
    console.error('❌ [ACTION] Retour d\'erreur:', errorResult);
    return errorResult;
  }
}
