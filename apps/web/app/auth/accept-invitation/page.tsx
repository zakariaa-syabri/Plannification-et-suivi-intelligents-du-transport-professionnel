'use client';

/**
 * ACCEPT INVITATION PAGE
 * Permet aux utilisateurs invités de créer un compte
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { acceptInvitationAction } from './_actions/accept-invitation.action';

const acceptInvitationSchema = z
  .object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    passwordConfirm: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['passwordConfirm'],
  });

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<{
    email: string;
    organization: string;
    userType: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
  });

  // Charger les infos de l'invitation
  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError('Token d\'invitation manquant');
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 Chargement invitation avec token:', token.substring(0, 8) + '...');
        const supabase = getSupabaseBrowserClient();

        const { data: invitation, error: invError } = await supabase
          .from('invitations')
          .select('email, organizations(name), user_type, status, expires_at')
          .eq('token', token)
          .maybeSingle();

        if (invError) {
          console.error('❌ Erreur chargement invitation:', invError);
          setError('Erreur lors du chargement de l\'invitation');
          setIsLoading(false);
          return;
        }

        if (!invitation) {
          console.warn('⚠️ Invitation non trouvée');
          setError('Invitation non trouvée');
          setIsLoading(false);
          return;
        }

        // Vérifier le statut
        if (invitation.status !== 'pending') {
          console.warn('⚠️ Invitation déjà utilisée ou annulée');
          setError('Cette invitation a déjà été utilisée ou annulée');
          setIsLoading(false);
          return;
        }

        // Vérifier l'expiration
        if (new Date(invitation.expires_at) < new Date()) {
          console.warn('⚠️ Invitation expirée');
          setError('Cette invitation a expiré');
          setIsLoading(false);
          return;
        }

        console.log('✅ Invitation valide');
        setInvitationInfo({
          email: invitation.email,
          organization: invitation.organizations?.name || 'Organisation',
          userType: invitation.user_type || 'staff',
        });

        // Pré-remplir l'email
        setValue('email', invitation.email);
        setIsLoading(false);
      } catch (err: any) {
        console.error('❌ Exception:', err);
        setError('Une erreur est survenue');
        setIsLoading(false);
      }
    };

    loadInvitation();
  }, [token, setValue]);

  const onSubmit = async (data: AcceptInvitationFormData) => {
    if (!token) {
      setError('Token manquant');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('📤 [CLIENT] Appel acceptInvitationAction');

      const result = await acceptInvitationAction({
        token,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      console.log('📥 [CLIENT] Résultat:', result);

      if (!result.success || result.error) {
        const errorMsg = result.error || 'Erreur lors de la création du compte';
        console.error('❌ [CLIENT] Erreur:', errorMsg);
        setError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      console.log('✅ [CLIENT] Compte créé avec succès!');

      // Attendre un peu et rediriger vers la connexion
      setTimeout(() => {
        router.push('/auth/sign-in?message=Compte créé avec succès! Veuillez vous connecter.');
      }, 2000);
    } catch (err: any) {
      console.error('❌ [CLIENT] Exception:', err);
      const errorMsg = err?.message || 'Une erreur est survenue';
      setError(`Erreur: ${errorMsg}`);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Chargement de l'invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitationInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => router.push('/auth/sign-in')}
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitationInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation invalide</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>L'invitation n'a pas pu être trouvée</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => router.push('/auth/sign-in')}
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Créer votre compte</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre <strong>{invitationInfo.organization}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email (lecture seule) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled value={invitationInfo.email} />
              <p className="text-xs text-muted-foreground">Défini par l'invitation</p>
            </div>

            {/* Prénom */}
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom (optionnel)</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Jean"
                {...register('firstName')}
                disabled={isSubmitting}
              />
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom (optionnel)</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Dupont"
                {...register('lastName')}
                disabled={isSubmitting}
              />
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirmation mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Confirmer le mot de passe</Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="••••••••"
                {...register('passwordConfirm')}
                disabled={isSubmitting}
              />
              {errors.passwordConfirm && (
                <p className="text-sm text-destructive">{errors.passwordConfirm.message}</p>
              )}
            </div>

            {/* Info rôle */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-muted-foreground">
                Rôle: <span className="font-semibold capitalize">{invitationInfo.userType}</span>
              </p>
            </div>

            {/* Bouton soumettre */}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Création en cours...' : 'Créer mon compte'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Vous avez déjà un compte?{' '}
            <a href="/auth/sign-in" className="text-primary hover:underline">
              Se connecter
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
