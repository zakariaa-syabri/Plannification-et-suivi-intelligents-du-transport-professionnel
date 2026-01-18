'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Card } from '@kit/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

const itemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  item_type: z.string().min(1, 'Le type est requis'),
  priority: z.string().default('standard'),
  description: z.string().optional(),
  site_id: z.string().min(1, 'Le site de pickup est requis'),
});

type ItemFormData = z.infer<typeof itemSchema>;

const ITEM_TYPES = [
  { value: 'passenger', label: 'Passager', icon: Icons.cargo.passenger },
  { value: 'student', label: 'Élève', icon: Icons.cargo.student },
  { value: 'parcel', label: 'Colis', icon: Icons.cargo.parcel },
  { value: 'product', label: 'Produit', icon: Icons.cargo.box },
  { value: 'patient', label: 'Patient', icon: Icons.cargo.customer },
  { value: 'custom', label: 'Autre', icon: Icons.cargo.cargo },
];

interface Site {
  id: string;
  name: string;
  site_type: string;
  address?: string;
}

export function AddItemPanel({ onClose }: { onClose: () => void }) {
  const [selectedType, setSelectedType] = useState('passenger');
  const [selectedPriority, setSelectedPriority] = useState('standard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      item_type: 'passenger',
      priority: 'standard',
    },
  });

  // Charger les sites disponibles
  useEffect(() => {
    async function loadSites() {
      try {
        const supabase = getSupabaseBrowserClient();
        const orgId = localStorage.getItem('current_organization_id');

        if (orgId) {
          const { data } = await supabase
            .from('sites')
            .select('id, name, site_type, address')
            .eq('organization_id', orgId);

          if (data) {
            setSites(data);
          }
        }
      } catch (error) {
        console.error('Erreur chargement sites:', error);
      }
    }

    loadSites();
  }, []);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setValue('item_type', type);
  };

  const onSubmit = async (data: ItemFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const orgId = localStorage.getItem('current_organization_id');

      if (!orgId) {
        setError('Organization non trouvée');
        setIsLoading(false);
        return;
      }

      const { createItemAction } = await import('../_actions/create-map-entity.action');
      const result = await createItemAction({
        organization_id: orgId,
        name: data.name,
        item_type: data.item_type,
        priority: data.priority,
        description: data.description,
        site_id: data.site_id,
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
        <Label>Type d'item</Label>
        <div className="grid grid-cols-2 gap-2">
          {ITEM_TYPES.map((type) => (
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
        <Label htmlFor="name">Nom / Identifiant *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Jean Dupont"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="site_id">Site de pickup *</Label>
        <Select
          onValueChange={(value) => setValue('site_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un site" />
          </SelectTrigger>
          <SelectContent>
            {sites.length === 0 ? (
              <SelectItem value="no-site" disabled>
                Aucun site disponible - Créez un site d'abord
              </SelectItem>
            ) : (
              sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name} ({site.site_type})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.site_id && (
          <p className="text-sm text-destructive">{errors.site_id.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          L'item sera localisé à l'adresse du site choisi
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">Priorité</Label>
        <Select
          defaultValue="standard"
          onValueChange={(value) => {
            setSelectedPriority(value);
            setValue('priority', value);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urgent">🔴 Urgent</SelectItem>
            <SelectItem value="high">🟠 Haute</SelectItem>
            <SelectItem value="standard">🟢 Standard</SelectItem>
            <SelectItem value="low">⚪ Basse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedType === 'parcel' || selectedType === 'product' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input type="number" placeholder="25.5" />
            </div>
            <div className="space-y-2">
              <Label>Volume (m³)</Label>
              <Input type="number" placeholder="0.5" />
            </div>
          </div>
        </>
      ) : null}

      {selectedType === 'student' || selectedType === 'passenger' ? (
        <>
          <div className="space-y-2">
            <Label>Contact</Label>
            <Input placeholder="+33 6 12 34 56 78" />
          </div>
        </>
      ) : null}

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
