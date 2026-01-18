/**
 * Page d'onboarding : Configuration de l'organisation
 * Page unique et simple - l'utilisateur crée son organisation
 */

import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { OrganizationForm } from './_components/organization-form';

export const metadata = {
  title: 'Créez votre organisation',
  description: 'Créez votre organisation et commencez à utiliser la plateforme',
};

export default async function OrganizationOnboardingPage() {
  const supabase = getSupabaseServerClient();

  // Vérifier que l'utilisateur est authentifié
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Vérifier si l'utilisateur a déjà une organisation approuvée
  const { data: existingMembership } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name)')
    .eq('user_id', user.id)
    .eq('approved', true)
    .maybeSingle();

  // Si l'utilisateur a déjà une organisation approuvée, rediriger vers l'app
  if (existingMembership) {
    redirect('/home');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🗺️</div>
          <h1 className="text-3xl font-bold mb-2">
            Créez votre organisation
          </h1>
          <p className="text-muted-foreground">
            Commencez par créer votre organisation, puis construisez votre système de transport sur mesure avec le Map Builder
          </p>
        </div>

        <OrganizationForm userId={user.id} />
      </div>
    </div>
  );
}
