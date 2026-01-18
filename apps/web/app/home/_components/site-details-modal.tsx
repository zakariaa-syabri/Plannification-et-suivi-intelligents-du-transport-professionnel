'use client';

/**
 * Modal pour afficher les détails d'un site avec ses items et sa capacité
 */

import { useState, useEffect } from 'react';
import { Card } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';
import { getSiteDetailsAction } from '../_actions/get-site-details.action';
import type { SiteDetails, SiteItem } from '../_actions/get-site-details.action';

interface SiteDetailsModalProps {
  siteId: string;
  onClose: () => void;
}

export function SiteDetailsModal({ siteId, onClose }: SiteDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteDetails, setSiteDetails] = useState<SiteDetails | null>(null);

  useEffect(() => {
    async function loadSiteDetails() {
      setLoading(true);
      setError(null);

      const result = await getSiteDetailsAction(siteId);

      if (result.success && result.data) {
        setSiteDetails(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement');
      }

      setLoading(false);
    }

    loadSiteDetails();
  }, [siteId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <Card className="w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center py-8">
            <Icon icon={Icons.ui.loading} className="animate-spin" size="lg" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !siteDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <Card className="w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error || 'Site non trouvé'}</p>
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </Card>
      </div>
    );
  }

  const { occupancy, items } = siteDetails;
  const isFull = occupancy?.is_full || false;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${siteDetails.color}20`, color: siteDetails.color }}
            >
              ●
            </div>
            <div>
              <h2 className="text-xl font-bold">{siteDetails.name}</h2>
              <p className="text-sm text-muted-foreground">{siteDetails.site_type}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <Icon icon={Icons.ui.close} size="sm" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avertissement si le site est plein */}
          {isFull && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                <Icon icon={Icons.status.alert} size="sm" />
                <span>Site plein - Capacité maximale atteinte</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ce site ne peut pas accueillir de nouveaux items. Veuillez libérer de l'espace ou choisir un autre site.
              </p>
            </div>
          )}

          {/* Informations générales */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Informations</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {siteDetails.address && (
                <div>
                  <span className="text-muted-foreground">Adresse:</span>
                  <p className="font-medium">{siteDetails.address}</p>
                </div>
              )}
              {siteDetails.city && (
                <div>
                  <span className="text-muted-foreground">Ville:</span>
                  <p className="font-medium">{siteDetails.city}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Statut:</span>
                <p className="font-medium capitalize">{siteDetails.status}</p>
              </div>
            </div>
          </div>

          {/* Capacités et occupation */}
          {occupancy && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Capacité et occupation</h3>

              {/* Nombre d'items */}
              {siteDetails.capacity_items_count && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Nombre d'items</span>
                    <span className="font-medium">
                      {occupancy.current_items_count} / {siteDetails.capacity_items_count}
                      {occupancy.items_occupancy_percent !== null && (
                        <span className="ml-2 text-muted-foreground">
                          ({occupancy.items_occupancy_percent}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        occupancy.items_occupancy_percent && occupancy.items_occupancy_percent >= 100
                          ? 'bg-destructive'
                          : occupancy.items_occupancy_percent && occupancy.items_occupancy_percent >= 80
                          ? 'bg-yellow-500'
                          : 'bg-primary'
                      }`}
                      style={{
                        width: `${Math.min(occupancy.items_occupancy_percent || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Poids */}
              {siteDetails.capacity_weight_kg && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Poids</span>
                    <span className="font-medium">
                      {occupancy.current_weight_kg.toFixed(2)} / {siteDetails.capacity_weight_kg.toFixed(2)} kg
                      {occupancy.weight_occupancy_percent !== null && (
                        <span className="ml-2 text-muted-foreground">
                          ({occupancy.weight_occupancy_percent}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        occupancy.weight_occupancy_percent && occupancy.weight_occupancy_percent >= 100
                          ? 'bg-destructive'
                          : occupancy.weight_occupancy_percent && occupancy.weight_occupancy_percent >= 80
                          ? 'bg-yellow-500'
                          : 'bg-primary'
                      }`}
                      style={{
                        width: `${Math.min(occupancy.weight_occupancy_percent || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Volume */}
              {siteDetails.capacity_volume_m3 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volume</span>
                    <span className="font-medium">
                      {occupancy.current_volume_m3.toFixed(3)} / {siteDetails.capacity_volume_m3.toFixed(3)} m³
                      {occupancy.volume_occupancy_percent !== null && (
                        <span className="ml-2 text-muted-foreground">
                          ({occupancy.volume_occupancy_percent}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        occupancy.volume_occupancy_percent && occupancy.volume_occupancy_percent >= 100
                          ? 'bg-destructive'
                          : occupancy.volume_occupancy_percent && occupancy.volume_occupancy_percent >= 80
                          ? 'bg-yellow-500'
                          : 'bg-primary'
                      }`}
                      style={{
                        width: `${Math.min(occupancy.volume_occupancy_percent || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Si aucune capacité n'est définie */}
              {!siteDetails.capacity_items_count &&
                !siteDetails.capacity_weight_kg &&
                !siteDetails.capacity_volume_m3 && (
                  <p className="text-sm text-muted-foreground">
                    Aucune contrainte de capacité définie pour ce site.
                  </p>
                )}
            </div>
          )}

          {/* Liste des items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              Items présents ({items.length})
            </h3>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun item dans ce site pour le moment.
              </p>
            ) : (
              <>
                {/* Items en attente de pickup */}
                {items.filter(i => i.status === 'pending' || i.status === 'assigned').length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                      En attente de ramassage ({items.filter(i => i.status === 'pending' || i.status === 'assigned').length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {items
                        .filter(i => i.status === 'pending' || i.status === 'assigned')
                        .map((item) => (
                          <Card key={item.id} className="p-3 border-l-4 border-l-yellow-500">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded flex items-center justify-center text-lg"
                                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                                >
                                  ●
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.identifier && `${item.identifier} • `}
                                    {item.item_type}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right text-xs text-muted-foreground space-y-1">
                                {item.weight_kg && (
                                  <p>{item.weight_kg.toFixed(2)} kg</p>
                                )}
                                {item.volume_m3 && (
                                  <p>{item.volume_m3.toFixed(3)} m³</p>
                                )}
                                <p className="capitalize">
                                  <span className="inline-block w-2 h-2 rounded-full mr-1 bg-yellow-500" />
                                  {item.status === 'pending' ? 'En attente' : 'Assigné'}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}

                {/* Items livrés */}
                {items.filter(i => i.status === 'delivered').length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                      Livrés à ce site ({items.filter(i => i.status === 'delivered').length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {items
                        .filter(i => i.status === 'delivered')
                        .map((item) => (
                          <Card key={item.id} className="p-3 border-l-4 border-l-green-500">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded flex items-center justify-center text-lg"
                                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                                >
                                  ●
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.identifier && `${item.identifier} • `}
                                    {item.item_type}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right text-xs text-muted-foreground space-y-1">
                                {item.weight_kg && (
                                  <p>{item.weight_kg.toFixed(2)} kg</p>
                                )}
                                {item.volume_m3 && (
                                  <p>{item.volume_m3.toFixed(3)} m³</p>
                                )}
                                <p className="capitalize">
                                  <span className="inline-block w-2 h-2 rounded-full mr-1 bg-green-500" />
                                  Livré
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t p-4 flex justify-end">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </Card>
    </div>
  );
}
