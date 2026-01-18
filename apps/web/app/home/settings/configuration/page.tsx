'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Badge } from '@kit/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';
import {
  OrganizationConfig,
  ElementTypeConfig,
  CustomField,
  FieldType,
  DEFAULT_ORGANIZATION_CONFIG,
} from '~/config/element-types.config';
import {
  getOrganizationConfigAction,
  saveFullConfigAction,
  addVehicleTypeAction,
  addSiteTypeAction,
  addItemTypeAction,
  deleteElementTypeAction,
} from '../../_actions/organization-config.action';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Heure' },
  { value: 'select', label: 'Liste déroulante' },
  { value: 'multiselect', label: 'Sélection multiple' },
  { value: 'boolean', label: 'Oui/Non' },
  { value: 'textarea', label: 'Texte long' },
];

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];

export default function ConfigurationPage() {
  const searchParams = useSearchParams();
  const isFirstTime = searchParams.get('first') === 'true';
  const showWelcome = searchParams.get('welcome') === 'true';

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [config, setConfig] = useState<OrganizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('labels');
  const [showWelcomeAlert, setShowWelcomeAlert] = useState(isFirstTime && showWelcome);

  // Dialog states
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [addTypeCategory, setAddTypeCategory] = useState<'vehicle' | 'site' | 'item'>('vehicle');
  const [newType, setNewType] = useState<Partial<ElementTypeConfig>>({
    name: '',
    namePlural: '',
    icon: 'package',
    color: '#3b82f6',
    description: '',
    fields: [],
  });

  // Charger la configuration
  useEffect(() => {
    async function loadConfig() {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (membership) {
          setOrganizationId(membership.organization_id);
          const result = await getOrganizationConfigAction(membership.organization_id);
          if (result.success && result.data) {
            setConfig(result.data);
          } else {
            // Utiliser la config par défaut si pas de config
            setConfig({
              id: '',
              organization_id: membership.organization_id,
              ...DEFAULT_ORGANIZATION_CONFIG,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
      setLoading(false);
    }

    loadConfig();
  }, []);

  // Sauvegarder la configuration
  const handleSave = async () => {
    if (!organizationId || !config) return;

    setSaving(true);
    const result = await saveFullConfigAction(organizationId, config);
    setSaving(false);

    if (result.success) {
      alert('Configuration sauvegardée !');
    } else {
      alert('Erreur: ' + result.error);
    }
  };

  // Ajouter un nouveau type
  const handleAddType = async () => {
    if (!organizationId || !newType.name) return;

    const typeConfig: ElementTypeConfig = {
      id: `${addTypeCategory}_${Date.now()}`,
      name: newType.name || '',
      namePlural: newType.namePlural || newType.name + 's',
      category: addTypeCategory,
      icon: newType.icon || 'package',
      color: newType.color || '#3b82f6',
      description: newType.description,
      fields: newType.fields || [],
    };

    let result;
    if (addTypeCategory === 'vehicle') {
      result = await addVehicleTypeAction(organizationId, typeConfig);
      if (result.success && config) {
        setConfig({
          ...config,
          vehicleTypes: [...config.vehicleTypes, typeConfig],
        });
      }
    } else if (addTypeCategory === 'site') {
      result = await addSiteTypeAction(organizationId, typeConfig);
      if (result.success && config) {
        setConfig({
          ...config,
          siteTypes: [...config.siteTypes, typeConfig],
        });
      }
    } else {
      result = await addItemTypeAction(organizationId, typeConfig);
      if (result.success && config) {
        setConfig({
          ...config,
          itemTypes: [...config.itemTypes, typeConfig],
        });
      }
    }

    setShowAddTypeDialog(false);
    setNewType({
      name: '',
      namePlural: '',
      icon: 'package',
      color: '#3b82f6',
      description: '',
      fields: [],
    });
  };

  // Supprimer un type
  const handleDeleteType = async (category: 'vehicle' | 'site' | 'item', typeId: string) => {
    if (!organizationId || !config) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type ?')) return;

    const result = await deleteElementTypeAction(organizationId, category, typeId);
    if (result.success) {
      if (category === 'vehicle') {
        setConfig({
          ...config,
          vehicleTypes: config.vehicleTypes.filter(t => t.id !== typeId),
        });
      } else if (category === 'site') {
        setConfig({
          ...config,
          siteTypes: config.siteTypes.filter(t => t.id !== typeId),
        });
      } else {
        setConfig({
          ...config,
          itemTypes: config.itemTypes.filter(t => t.id !== typeId),
        });
      }
    }
  };

  // Ajouter un champ au nouveau type
  const addFieldToNewType = () => {
    setNewType({
      ...newType,
      fields: [
        ...(newType.fields || []),
        {
          id: `field_${Date.now()}`,
          name: '',
          type: 'text',
          label: '',
          required: false,
        },
      ],
    });
  };

  // Mettre à jour un champ
  const updateField = (index: number, field: Partial<CustomField>) => {
    const fields = [...(newType.fields || [])];
    fields[index] = { ...fields[index], ...field };
    setNewType({ ...newType, fields });
  };

  // Supprimer un champ
  const removeField = (index: number) => {
    const fields = [...(newType.fields || [])];
    fields.splice(index, 1);
    setNewType({ ...newType, fields });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon icon={Icons.ui.loading} className="animate-spin" size="xl" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center">
        <p>Impossible de charger la configuration.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Configuration</h1>
          <p className="text-muted-foreground">
            Personnalisez votre plateforme selon vos besoins
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Icon icon={Icons.ui.loading} className="animate-spin mr-2" size="sm" />
          ) : (
            <Icon icon={Icons.action.save} className="mr-2" size="sm" />
          )}
          Sauvegarder
        </Button>
      </div>

      {/* Message de bienvenue pour les nouveaux utilisateurs */}
      {showWelcomeAlert && (
        <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Icon icon={Icons.settings.settings} className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Bienvenue dans votre espace de configuration! 🎉
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <p className="mb-3">
              Avant de commencer à utiliser votre système de transport, personnalisez-le selon votre activité :
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Labels :</strong> Définissez comment vous appelez vos éléments (véhicule, site, item, etc.)</li>
              <li><strong>Types :</strong> Créez les différents types d'éléments que vous utilisez</li>
              <li><strong>Champs personnalisés :</strong> Ajoutez les informations spécifiques à votre activité</li>
              <li><strong>Paramètres :</strong> Configurez les unités, la devise, le fuseau horaire, etc.</li>
            </ul>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWelcomeAlert(false)}
                className="border-blue-600 text-blue-600 hover:bg-blue-100"
              >
                Compris, je commence la personnalisation
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="vehicles">Types de véhicules</TabsTrigger>
          <TabsTrigger value="sites">Types de sites</TabsTrigger>
          <TabsTrigger value="items">Types d'éléments</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* Labels Tab */}
        <TabsContent value="labels">
          <Card>
            <CardHeader>
              <CardTitle>Labels personnalisés</CardTitle>
              <CardDescription>
                Définissez comment vous appelez vos éléments
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Véhicule (singulier)</Label>
                <Input
                  value={config.labels.vehicle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      labels: { ...config.labels, vehicle: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Véhicules (pluriel)</Label>
                <Input
                  value={config.labels.vehiclePlural}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      labels: { ...config.labels, vehiclePlural: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Site (singulier)</Label>
                <Input
                  value={config.labels.site}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      labels: { ...config.labels, site: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Sites (pluriel)</Label>
                <Input
                  value={config.labels.sitePlural}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      labels: { ...config.labels, sitePlural: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Élément (singulier)</Label>
                <Input
                  value={config.labels.item}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      labels: { ...config.labels, item: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Éléments (pluriel)</Label>
                <Input
                  value={config.labels.itemPlural}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      labels: { ...config.labels, itemPlural: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Mission (singulier)</Label>
                <Input
                  value={config.labels.mission}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      labels: { ...config.labels, mission: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Missions (pluriel)</Label>
                <Input
                  value={config.labels.missionPlural}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      labels: { ...config.labels, missionPlural: e.target.value },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicle Types Tab */}
        <TabsContent value="vehicles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Types de {config.labels.vehiclePlural.toLowerCase()}</CardTitle>
                <CardDescription>
                  Définissez les différents types de {config.labels.vehiclePlural.toLowerCase()}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setAddTypeCategory('vehicle');
                  setShowAddTypeDialog(true);
                }}
              >
                <Icon icon={Icons.action.add} className="mr-2" size="sm" />
                Ajouter un type
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.vehicleTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: type.color + '20' }}
                      >
                        <span style={{ color: type.color }}>●</span>
                      </div>
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {type.fields.length} champ(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {type.isDefault && <Badge variant="secondary">Par défaut</Badge>}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteType('vehicle', type.id)}
                      >
                        <Icon icon={Icons.action.delete} size="sm" />
                      </Button>
                    </div>
                  </div>
                ))}
                {config.vehicleTypes.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Aucun type défini
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Site Types Tab */}
        <TabsContent value="sites">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Types de {config.labels.sitePlural.toLowerCase()}</CardTitle>
                <CardDescription>
                  Définissez les différents types de {config.labels.sitePlural.toLowerCase()}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setAddTypeCategory('site');
                  setShowAddTypeDialog(true);
                }}
              >
                <Icon icon={Icons.action.add} className="mr-2" size="sm" />
                Ajouter un type
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.siteTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: type.color + '20' }}
                      >
                        <span style={{ color: type.color }}>●</span>
                      </div>
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {type.fields.length} champ(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {type.isDefault && <Badge variant="secondary">Par défaut</Badge>}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteType('site', type.id)}
                      >
                        <Icon icon={Icons.action.delete} size="sm" />
                      </Button>
                    </div>
                  </div>
                ))}
                {config.siteTypes.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Aucun type défini
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Types Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Types d'{config.labels.itemPlural.toLowerCase()}</CardTitle>
                <CardDescription>
                  Définissez les différents types d'{config.labels.itemPlural.toLowerCase()}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setAddTypeCategory('item');
                  setShowAddTypeDialog(true);
                }}
              >
                <Icon icon={Icons.action.add} className="mr-2" size="sm" />
                Ajouter un type
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {config.itemTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: type.color + '20' }}
                      >
                        <span style={{ color: type.color }}>●</span>
                      </div>
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {type.fields.length} champ(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {type.isDefault && <Badge variant="secondary">Par défaut</Badge>}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteType('item', type.id)}
                      >
                        <Icon icon={Icons.action.delete} size="sm" />
                      </Button>
                    </div>
                  </div>
                ))}
                {config.itemTypes.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Aucun type défini
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres généraux</CardTitle>
              <CardDescription>
                Configurez les paramètres par défaut de votre plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unité de distance</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={config.settings.distanceUnit}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: {
                        ...config.settings,
                        distanceUnit: e.target.value as 'km' | 'miles',
                      },
                    })
                  }
                >
                  <option value="km">Kilomètres</option>
                  <option value="miles">Miles</option>
                </select>
              </div>
              <div>
                <Label>Devise</Label>
                <Input
                  value={config.settings.currency}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, currency: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Fuseau horaire</Label>
                <Input
                  value={config.settings.timezone}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, timezone: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Langue</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={config.settings.language}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, language: e.target.value },
                    })
                  }
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <Label>Zoom par défaut</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={config.settings.defaultZoom}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      settings: {
                        ...config.settings,
                        defaultZoom: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pour ajouter un nouveau type */}
      <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ajouter un type de{' '}
              {addTypeCategory === 'vehicle'
                ? config.labels.vehicle.toLowerCase()
                : addTypeCategory === 'site'
                ? config.labels.site.toLowerCase()
                : config.labels.item.toLowerCase()}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom (singulier) *</Label>
                <Input
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  placeholder="Ex: Camion"
                />
              </div>
              <div>
                <Label>Nom (pluriel)</Label>
                <Input
                  value={newType.namePlural}
                  onChange={(e) => setNewType({ ...newType, namePlural: e.target.value })}
                  placeholder="Ex: Camions"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={newType.description}
                onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                placeholder="Description de ce type..."
              />
            </div>

            <div>
              <Label>Couleur</Label>
              <div className="flex gap-2 mt-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newType.color === color ? 'border-black' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewType({ ...newType, color })}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Champs personnalisés</Label>
                <Button variant="outline" size="sm" onClick={addFieldToNewType}>
                  <Icon icon={Icons.action.add} size="sm" className="mr-1" />
                  Ajouter un champ
                </Button>
              </div>

              <div className="space-y-3">
                {(newType.fields || []).map((field, index) => (
                  <div key={field.id} className="p-3 border rounded-lg">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <Input
                        placeholder="Nom du champ"
                        value={field.label}
                        onChange={(e) =>
                          updateField(index, {
                            label: e.target.value,
                            name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                          })
                        }
                      />
                      <select
                        className="p-2 border rounded-md"
                        value={field.type}
                        onChange={(e) =>
                          updateField(index, { type: e.target.value as FieldType })
                        }
                      >
                        {FIELD_TYPES.map((ft) => (
                          <option key={ft.value} value={ft.value}>
                            {ft.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(index, { required: e.target.checked })
                            }
                          />
                          Requis
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(index)}
                        >
                          <Icon icon={Icons.action.delete} size="sm" />
                        </Button>
                      </div>
                    </div>
                    {(field.type === 'select' || field.type === 'multiselect') && (
                      <Input
                        placeholder="Options (séparées par des virgules)"
                        value={(field.options || []).join(', ')}
                        onChange={(e) =>
                          updateField(index, {
                            options: e.target.value.split(',').map((o) => o.trim()),
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddTypeDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddType} disabled={!newType.name}>
                Créer le type
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
