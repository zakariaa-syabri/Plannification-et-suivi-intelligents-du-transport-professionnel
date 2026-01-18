'use client';

/**
 * Panel pour ajouter un véhicule
 * Utilise les types dynamiques définis dans la configuration
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Card } from '@kit/ui/card';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';
import { getOrganizationConfigAction } from '../_actions/organization-config.action';
import type { ElementTypeConfig, OrganizationConfig } from '~/config/element-types.config';

const vehicleSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  vehicle_type: z.string().min(1, 'Le type est requis'),
  identifier: z.string().optional(),
  capacity: z.coerce.number().min(0).optional(),
  icon: z.string().default('truck'),
  color: z.string().default('#3b82f6'),
  address: z.string().min(1, 'L\'adresse actuelle est requise pour localiser le véhicule'),
  customFields: z.record(z.any()).optional(),
  // Nouveaux champs pour capacités et consommation
  capacity_weight_kg: z.coerce.number().min(0, 'La capacité en poids doit être positive').optional(),
  capacity_volume_m3: z.coerce.number().min(0, 'La capacité en volume doit être positive').optional(),
  fuel_type: z.enum(['diesel', 'gasoline', 'electric', 'hybrid', 'hydrogen', 'cng', 'lpg', 'other']).optional(),
  fuel_consumption: z.coerce.number().min(0, 'La consommation doit être positive').optional(),
  consumption_unit: z.enum(['L/100km', 'kWh/100km', 'km/kg', 'm³/100km']).optional(),
  tank_capacity: z.coerce.number().min(0, 'La capacité du réservoir doit être positive').optional(),
  range_km: z.coerce.number().min(0, 'L\'autonomie doit être positive').optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

const COLORS = [
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Vert', value: '#10b981' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Jaune', value: '#eab308' },
  { name: 'Gris', value: '#6b7280' },
];

interface AddVehiclePanelProps {
  onClose: () => void;
}

export function AddVehiclePanel({ onClose }: AddVehiclePanelProps) {
  const [config, setConfig] = useState<OrganizationConfig | null>(null);
  const [vehicleTypes, setVehicleTypes] = useState<ElementTypeConfig[]>([]);
  const [selectedType, setSelectedType] = useState<ElementTypeConfig | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#3b82f6');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      icon: 'truck',
      color: '#3b82f6',
      vehicle_type: '',
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Charger la configuration au montage
  useEffect(() => {
    async function loadConfig() {
      const orgId = localStorage.getItem('current_organization_id');
      if (orgId) {
        const result = await getOrganizationConfigAction(orgId);
        if (result.success && result.data) {
          setConfig(result.data);
          setVehicleTypes(result.data.vehicleTypes);
          if (result.data.vehicleTypes.length > 0) {
            const defaultType = result.data.vehicleTypes.find(t => t.isDefault) || result.data.vehicleTypes[0];
            setSelectedType(defaultType);
            setSelectedColor(defaultType.color);
            setValue('vehicle_type', defaultType.id);
            setValue('color', defaultType.color);
          }
        }
      }
      setConfigLoading(false);
    }
    loadConfig();
  }, [setValue]);

  const onSubmit = async (data: VehicleFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const orgId = localStorage.getItem('current_organization_id');

      if (!orgId) {
        setError('Organization non trouvée');
        setIsLoading(false);
        return;
      }

      // Géocoder l'adresse
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

      const { createVehicleAction } = await import('../_actions/create-map-entity.action');
      const result = await createVehicleAction({
        organization_id: orgId,
        name: data.name,
        vehicle_type: data.vehicle_type,
        identifier: data.identifier,
        capacity: data.capacity,
        icon: data.icon,
        color: data.color,
        latitude,
        longitude,
        // Nouveaux champs
        capacity_weight_kg: data.capacity_weight_kg,
        capacity_volume_m3: data.capacity_volume_m3,
        fuel_type: data.fuel_type,
        fuel_consumption: data.fuel_consumption,
        consumption_unit: data.consumption_unit,
        tank_capacity: data.tank_capacity,
        range_km: data.range_km,
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

  const handleTypeChange = (type: ElementTypeConfig) => {
    setSelectedType(type);
    setSelectedColor(type.color);
    setValue('vehicle_type', type.id);
    setValue('color', type.color);
    setCustomFieldValues({});
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setValue('color', color);
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon icon={Icons.ui.loading} className="animate-spin" size="lg" />
      </div>
    );
  }

  if (vehicleTypes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          Aucun type de {config?.labels.vehicle.toLowerCase() || 'véhicule'} configuré.
        </p>
        <Button variant="outline" onClick={() => window.location.href = '/home/settings/configuration'}>
          Configurer les types
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {/* Type de véhicule */}
      <div className="space-y-3">
        <Label>Type de {config?.labels.vehicle.toLowerCase() || 'véhicule'}</Label>
        <div className="grid grid-cols-2 gap-2">
          {vehicleTypes.map((type) => (
            <Card
              key={type.id}
              className={`p-3 cursor-pointer transition-all ${
                selectedType?.id === type.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleTypeChange(type)}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: type.color + '20' }}
                >
                  <span style={{ color: type.color, fontSize: '1.2rem' }}>●</span>
                </div>
                <span className="text-sm font-medium">{type.name}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nom du véhicule <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Bus #12"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Identifiant */}
      <div className="space-y-2">
        <Label htmlFor="identifier">
          Immatriculation / Numéro
        </Label>
        <Input
          id="identifier"
          {...register('identifier')}
          placeholder="AB-123-CD"
        />
      </div>

      {/* Section Capacités */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="text-lg font-semibold">Capacités du véhicule</Label>

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
              placeholder="1000"
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
              placeholder="20"
            />
            {errors.capacity_volume_m3 && (
              <p className="text-sm text-destructive">{errors.capacity_volume_m3.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section Consommation énergétique */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="text-lg font-semibold">Consommation énergétique</Label>

        {/* Type de carburant */}
        <div className="space-y-2">
          <Label htmlFor="fuel_type">
            Type de carburant / énergie
          </Label>
          <select
            id="fuel_type"
            {...register('fuel_type')}
            className="w-full p-2 border rounded-md bg-background"
          >
            <option value="">Sélectionner...</option>
            <option value="diesel">Diesel</option>
            <option value="gasoline">Essence</option>
            <option value="electric">Électrique</option>
            <option value="hybrid">Hybride</option>
            <option value="hydrogen">Hydrogène</option>
            <option value="cng">GNC (Gaz Naturel Comprimé)</option>
            <option value="lpg">GPL (Gaz de Pétrole Liquéfié)</option>
            <option value="other">Autre</option>
          </select>
          {errors.fuel_type && (
            <p className="text-sm text-destructive">{errors.fuel_type.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Consommation */}
          <div className="space-y-2">
            <Label htmlFor="fuel_consumption">
              Consommation
            </Label>
            <Input
              id="fuel_consumption"
              type="number"
              step="0.01"
              min="0"
              {...register('fuel_consumption')}
              placeholder="8.5"
            />
            {errors.fuel_consumption && (
              <p className="text-sm text-destructive">{errors.fuel_consumption.message}</p>
            )}
          </div>

          {/* Unité de consommation */}
          <div className="space-y-2">
            <Label htmlFor="consumption_unit">
              Unité
            </Label>
            <select
              id="consumption_unit"
              {...register('consumption_unit')}
              className="w-full p-2 border rounded-md bg-background"
            >
              <option value="L/100km">L/100km</option>
              <option value="kWh/100km">kWh/100km</option>
              <option value="km/kg">km/kg</option>
              <option value="m³/100km">m³/100km</option>
            </select>
            {errors.consumption_unit && (
              <p className="text-sm text-destructive">{errors.consumption_unit.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Capacité du réservoir */}
          <div className="space-y-2">
            <Label htmlFor="tank_capacity">
              Capacité réservoir/batterie
            </Label>
            <Input
              id="tank_capacity"
              type="number"
              step="0.01"
              min="0"
              {...register('tank_capacity')}
              placeholder="60"
            />
            <p className="text-xs text-muted-foreground">
              Litres (carburant) ou kWh (électrique)
            </p>
            {errors.tank_capacity && (
              <p className="text-sm text-destructive">{errors.tank_capacity.message}</p>
            )}
          </div>

          {/* Autonomie */}
          <div className="space-y-2">
            <Label htmlFor="range_km">
              Autonomie (km)
            </Label>
            <Input
              id="range_km"
              type="number"
              step="0.01"
              min="0"
              {...register('range_km')}
              placeholder="700"
            />
            {errors.range_km && (
              <p className="text-sm text-destructive">{errors.range_km.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Adresse actuelle */}
      <div className="space-y-2">
        <Label htmlFor="address">
          Adresse actuelle <span className="text-destructive">*</span>
        </Label>
        <Input
          id="address"
          {...register('address')}
          placeholder="10 Rue de la Paix, 75002 Paris"
        />
        {errors.address && (
          <p className="text-sm text-destructive">{errors.address.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          L'adresse sera utilisée pour placer le {config?.labels.vehicle.toLowerCase() || 'véhicule'} sur la carte
        </p>
      </div>

      {/* Champs personnalisés dynamiques */}
      {selectedType && selectedType.fields.length > 0 && (
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-muted-foreground">Champs personnalisés</Label>
          {selectedType.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
              {field.type === 'text' && (
                <Input
                  id={field.name}
                  placeholder={field.placeholder}
                  value={customFieldValues[field.name] || ''}
                  onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                />
              )}
              {field.type === 'number' && (
                <Input
                  id={field.name}
                  type="number"
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder}
                  value={customFieldValues[field.name] || ''}
                  onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                />
              )}
              {field.type === 'textarea' && (
                <textarea
                  id={field.name}
                  className="w-full p-2 border rounded-md"
                  placeholder={field.placeholder}
                  value={customFieldValues[field.name] || ''}
                  onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                />
              )}
              {field.type === 'select' && (
                <select
                  id={field.name}
                  className="w-full p-2 border rounded-md"
                  value={customFieldValues[field.name] || ''}
                  onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                >
                  <option value="">Sélectionner...</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {field.type === 'boolean' && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={customFieldValues[field.name] || false}
                    onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
                  />
                  <span className="text-sm">{field.helpText || 'Oui'}</span>
                </label>
              )}
              {field.helpText && field.type !== 'boolean' && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Couleur */}
      <div className="space-y-3">
        <Label>Couleur sur la carte</Label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => handleColorChange(color.value)}
              className={`w-10 h-10 rounded-full transition-all ${
                selectedColor === color.value
                  ? 'ring-2 ring-offset-2 ring-primary scale-110'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      {selectedType && (
        <Card className="p-4 bg-muted">
          <div className="text-sm font-medium mb-2">Aperçu:</div>
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${selectedColor}20` }}
            >
              <span style={{ color: selectedColor, fontSize: '1.5rem' }}>●</span>
            </div>
            <div>
              <div className="font-semibold">{selectedType.name}</div>
              <div className="text-xs text-muted-foreground">
                {selectedType.description || `Type: ${selectedType.name}`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Boutons */}
      <div className="flex gap-3 pt-4">
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
