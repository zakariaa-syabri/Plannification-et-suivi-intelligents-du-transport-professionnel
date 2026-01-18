'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Card } from '@kit/ui/card';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';

const siteSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  site_type: z.string().min(1, 'Le type est requis'),
  address: z.string().min(1, 'L\'adresse est requise pour localiser le site'),
  // Champs de capacité
  capacity_weight_kg: z.coerce.number().min(0, 'La capacité en poids doit être positive').optional(),
  capacity_volume_m3: z.coerce.number().min(0, 'La capacité en volume doit être positive').optional(),
  capacity_items_count: z.coerce.number().int().min(0, 'Le nombre d\'items doit être positif').optional(),
});

type SiteFormData = z.infer<typeof siteSchema>;

const SITE_TYPES = [
  { value: 'depot', label: 'Dépôt', icon: Icons.domain.warehouse },
  { value: 'school', label: 'École', icon: Icons.domain.schoolTransport },
  { value: 'warehouse', label: 'Entrepôt', icon: Icons.domain.logistics },
  { value: 'station', label: 'Station', icon: Icons.location.location },
  { value: 'hospital', label: 'Hôpital', icon: Icons.domain.medical },
  { value: 'office', label: 'Bureau', icon: Icons.navigation.organization },
];

export function AddSitePanel({ onClose }: { onClose: () => void }) {
  const [selectedType, setSelectedType] = useState('depot');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      site_type: 'depot',
    },
  });

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setValue('site_type', type);
  };

  const onSubmit = async (data: SiteFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const orgId = localStorage.getItem('current_organization_id');

      if (!orgId) {
        setError('Organization non trouvée');
        setIsLoading(false);
        return;
      }

      // Géocoder l'adresse si elle est fournie
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (data.address) {
        const { geocodeAddress } = await import('../_actions/geocode-address.action');
        const geocodeResult = await geocodeAddress(data.address);

        if (geocodeResult.success && geocodeResult.data) {
          latitude = geocodeResult.data.latitude;
          longitude = geocodeResult.data.longitude;
        } else {
          setError('Impossible de localiser l\'adresse. Veuillez vérifier l\'adresse.');
          setIsLoading(false);
          return;
        }
      }

      const { createSiteAction } = await import('../_actions/create-map-entity.action');
      const result = await createSiteAction({
        organization_id: orgId,
        name: data.name,
        site_type: data.site_type,
        address: data.address,
        latitude,
        longitude,
        // Nouveaux champs de capacité
        capacity_weight_kg: data.capacity_weight_kg,
        capacity_volume_m3: data.capacity_volume_m3,
        capacity_items_count: data.capacity_items_count,
      });

      if (result.success) {
        onClose();
        window.location.reload();
      } else {
        setError(result.error || 'Erreur lors de la création');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <div className="space-y-3">
        <Label>Type de site</Label>
        <div className="grid grid-cols-2 gap-2">
          {SITE_TYPES.map((type) => (
            <Card
              key={type.value}
              className={`p-3 cursor-pointer ${selectedType === type.value ? 'border-primary ring-2 ring-primary/20' : ''}`}
              onClick={() => handleTypeChange(type.value)}
            >
              <div className="flex flex-col items-center gap-2">
                <Icon icon={type.icon} size="lg" />
                <span className="text-sm">{type.label}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nom du site *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Nom du site"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse complète *</Label>
        <Input
          id="address"
          {...register('address')}
          placeholder="123 Rue Example, 75001 Paris"
        />
        {errors.address && (
          <p className="text-sm text-destructive">{errors.address.message}</p>
        )}
      </div>

      {/* Section Capacités du site */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="text-lg font-semibold">Capacités du site (optionnel)</Label>
        <p className="text-sm text-muted-foreground">
          Définissez les capacités de stockage pour ce site. Ces limites seront utilisées pour détecter quand le site est plein.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {/* Capacité en nombre d'items */}
          <div className="space-y-2">
            <Label htmlFor="capacity_items_count">
              Nombre maximum d'items
            </Label>
            <Input
              id="capacity_items_count"
              type="number"
              step="1"
              min="0"
              {...register('capacity_items_count')}
              placeholder="Ex: 50"
            />
            {errors.capacity_items_count && (
              <p className="text-sm text-destructive">{errors.capacity_items_count.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Nombre maximum d'éléments que ce site peut contenir
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Capacité en poids */}
            <div className="space-y-2">
              <Label htmlFor="capacity_weight_kg">
                Capacité poids (kg)
              </Label>
              <Input
                id="capacity_weight_kg"
                type="number"
                step="0.01"
                min="0"
                {...register('capacity_weight_kg')}
                placeholder="Ex: 5000"
              />
              {errors.capacity_weight_kg && (
                <p className="text-sm text-destructive">{errors.capacity_weight_kg.message}</p>
              )}
            </div>

            {/* Capacité en volume */}
            <div className="space-y-2">
              <Label htmlFor="capacity_volume_m3">
                Capacité volume (m³)
              </Label>
              <Input
                id="capacity_volume_m3"
                type="number"
                step="0.001"
                min="0"
                {...register('capacity_volume_m3')}
                placeholder="Ex: 100"
              />
              {errors.capacity_volume_m3 && (
                <p className="text-sm text-destructive">{errors.capacity_volume_m3.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <div className="flex gap-2 text-sm">
          <Icon icon={Icons.status.info} size="sm" className="text-blue-600 mt-0.5" />
          <p className="text-blue-900 dark:text-blue-100">
            L'adresse sera géolocalisée automatiquement pour placer le site sur la carte
          </p>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          <Icon icon={isLoading ? Icons.ui.loading : Icons.action.add} size="sm" className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Création...' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}
