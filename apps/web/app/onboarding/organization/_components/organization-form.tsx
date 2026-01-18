'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Label } from '@kit/ui/label';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { createOrganizationAction } from '../_actions/create-organization.action';

const organizationSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  description: z.string().optional(),
  contact_email: z.string().email('Email invalide').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

// Helper pour générer un slug
function generateOrganizationSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface OrganizationFormProps {
  userId: string;
}

export function OrganizationForm({ userId }: OrganizationFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
  });

  const organizationName = watch('name');
  const generatedSlug = organizationName
    ? generateOrganizationSlug(organizationName)
    : '';

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📤 [CLIENT] Envoi createOrganizationAction avec:', {
        owner_id: userId,
        name: data.name,
        slug: generatedSlug,
      });

      const result = await createOrganizationAction({
        owner_id: userId,
        name: data.name,
        slug: generatedSlug,
        description: data.description || undefined,
        contact_email: data.contact_email || undefined,
        contact_phone: data.contact_phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        postal_code: data.postal_code || undefined,
      });

      console.log('📥 [CLIENT] Résultat reçu:', result);
      console.log('📥 [CLIENT] Type de result:', typeof result);
      console.log('📥 [CLIENT] Keys:', Object.keys(result));
      console.log('📥 [CLIENT] result.success:', result?.success);
      console.log('📥 [CLIENT] result.error:', result?.error);

      if (!result || !result.success || result.error) {
        const errorMessage = result?.error || 'Erreur inconnue lors de la création de l\'organisation';
        console.error('❌ [CLIENT] Erreur:', errorMessage);
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      console.log('✅ [CLIENT] Succès! Organisation créée:', result.organization);

      // Succès ! Rafraîchir le cache et forcer un rechargement complet
      console.log('🔄 [CLIENT] Rafraîchissement du cache...');

      // Forcer un rechargement complet de la page pour synchroniser tous les contextes
      // Cela garantit que UserRoleContext récupère le nouveau organization_member
      console.log('🔄 [CLIENT] Rechargement de la page pour synchronisation complète...');
      window.location.href = '/home';
    } catch (err) {
      console.error('❌ [CLIENT] Exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Une erreur est survenue: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations de votre organisation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Nom de l'organisation */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom de l'organisation <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Mon École de Transport"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
            {generatedSlug && (
              <p className="text-xs text-muted-foreground">
                Identifiant unique : <code className="bg-muted px-1 py-0.5 rounded">{generatedSlug}</code>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Décrivez brièvement votre activité..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Contact email */}
          <div className="space-y-2">
            <Label htmlFor="contact_email">Email de contact (optionnel)</Label>
            <Input
              id="contact_email"
              type="email"
              {...register('contact_email')}
              placeholder="contact@monorganisation.com"
              disabled={isLoading}
            />
            {errors.contact_email && (
              <p className="text-sm text-destructive">{errors.contact_email.message}</p>
            )}
          </div>

          {/* Contact phone */}
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Téléphone (optionnel)</Label>
            <Input
              id="contact_phone"
              type="tel"
              {...register('contact_phone')}
              placeholder="+33 1 23 45 67 89"
              disabled={isLoading}
            />
          </div>

          {/* Adresse */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse (optionnel)</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="123 Rue Example"
              disabled={isLoading}
            />
          </div>

          {/* Ville et code postal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Code postal</Label>
              <Input
                id="postal_code"
                {...register('postal_code')}
                placeholder="75001"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Paris"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Info Map Builder */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <div className="text-2xl">🗺️</div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Map Builder Universel</h4>
                <p className="text-sm text-muted-foreground">
                  Après création, vous accéderez au Map Builder pour construire votre système de transport personnalisé :
                  ajoutez vos véhicules, vos sites et vos items directement sur la carte.
                </p>
              </div>
            </div>
          </div>

          {/* Bouton de soumission */}
          <div className="pt-4">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Création en cours...' : 'Créer mon organisation et accéder au Map Builder →'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
