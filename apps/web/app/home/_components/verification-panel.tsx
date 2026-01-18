'use client';

/**
 * Panneau visuel de vérification du système
 * Affiche l'état complet des items, sites et véhicules
 */

import { useState } from 'react';
import { Card } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { verifySetupAction } from '../_actions/verify-setup.action';
import { deleteAllItemsAction } from '../_actions/delete-all-items.action';

type VerificationResult = {
  success: boolean;
  error?: string;
  columnExists: boolean;
  totalItems: number;
  statusCounts: { [status: string]: number };
  itemsWithDropoff: number;
  deliveredItems: number;
  sites: Array<{
    id: string;
    name: string;
    waitingCount: number;
    deliveredCount: number;
    waitingItems: Array<{ id: string; name: string; status: string }>;
    deliveredItems: Array<{ id: string; name: string; status: string }>;
  }>;
  vehicles: Array<{
    id: string;
    name: string;
    loadedCount: number;
    loadedItemIds: string[];
  }>;
  orphanItems: Array<{
    id: string;
    name: string;
    status: string;
    pickup_site_id: string | null;
    dropoff_site_id: string | null;
  }>;
};

interface VerificationPanelProps {
  organizationId: string;
}

export function VerificationPanel({ organizationId }: VerificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      const data = await verifySetupAction(organizationId);
      setResult(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Erreur vérification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllItems = async () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUS les items ?\n\nCette action est irréversible !')) {
      return;
    }

    setIsDeleting(true);
    try {
      const deleteResult = await deleteAllItemsAction(organizationId);

      if (deleteResult.success) {
        alert(`✅ ${deleteResult.deleted} items supprimés avec succès !`);

        // Rafraîchir la vérification
        const data = await verifySetupAction(organizationId);
        setResult(data);

        // Recharger la page pour mettre à jour toutes les données
        window.location.reload();
      } else {
        alert(`❌ Erreur: ${deleteResult.error}`);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !result) {
    return (
      <Button
        onClick={handleVerify}
        disabled={isLoading}
        variant="outline"
        className="gap-2"
      >
        {isLoading ? '⏳ Vérification...' : '✅ Vérifier le Système'}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6">
        {/* En-tête */}
        <div className="mb-6 flex items-center justify-between border-b pb-4">
          <h2 className="text-2xl font-bold">🔍 Vérification du Système</h2>
          <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm">
            ✕ Fermer
          </Button>
        </div>

        {/* Erreur globale */}
        {!result.success && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">
            <strong>❌ Erreur:</strong> {result.error}
          </div>
        )}

        {/* 1. État de la migration */}
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold">1️⃣ Migration de la base de données</h3>
          <div
            className={`rounded-lg p-4 ${
              result.columnExists ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {result.columnExists ? (
              <div>
                <div className="mb-2 text-lg font-bold">✅ Migration appliquée avec succès</div>
                <div className="text-sm">
                  La colonne <code className="font-mono">current_loaded_items</code> existe sur la table
                  vehicles.
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 text-lg font-bold">❌ Migration non appliquée</div>
                <div className="text-sm">
                  Vous devez exécuter: <code className="font-mono">pnpm supabase migration up</code>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. État des items */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">2️⃣ État des items</h3>
            {result.totalItems > 0 && (
              <Button
                onClick={handleDeleteAllItems}
                disabled={isDeleting}
                variant="destructive"
                size="sm"
              >
                {isDeleting ? '⏳ Suppression...' : '🗑️ Tout supprimer'}
              </Button>
            )}
          </div>
          <div className="grid gap-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="mb-2 text-sm font-semibold text-blue-900">Total des items</div>
              <div className="text-3xl font-bold text-blue-700">{result.totalItems}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.entries(result.statusCounts).map(([status, count]) => {
                const colors = {
                  pending: 'bg-yellow-50 text-yellow-800',
                  assigned: 'bg-orange-50 text-orange-800',
                  in_transit: 'bg-blue-50 text-blue-800',
                  delivered: 'bg-green-50 text-green-800',
                };
                const color = colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-800';

                return (
                  <div key={status} className={`rounded-lg p-3 ${color}`}>
                    <div className="text-sm font-semibold capitalize">{status}</div>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-indigo-50 p-3 text-indigo-800">
                <div className="text-sm font-semibold">Items avec destination définie</div>
                <div className="text-xl font-bold">
                  {result.itemsWithDropoff} / {result.totalItems}
                </div>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-green-800">
                <div className="text-sm font-semibold">Items livrés</div>
                <div className="text-xl font-bold">{result.deliveredItems}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2.5 Items orphelins (sans site de pickup) */}
        {result.orphanItems.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold">
              ⚠️ Items ORPHELINS ({result.orphanItems.length})
            </h3>
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
              <div className="mb-3 text-sm font-semibold text-red-800">
                Ces items existent dans la base de données mais n'ont pas de site de pickup défini.
                C'est pourquoi ils n'apparaissent dans aucun site.
              </div>
              <div className="space-y-2">
                {result.orphanItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg bg-white p-3 shadow-sm"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold text-red-900">{item.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-red-700">
                      <div>
                        pickup_site_id:{' '}
                        <span className="font-mono font-semibold">
                          {item.pickup_site_id || 'NULL ❌'}
                        </span>
                      </div>
                      <div>
                        dropoff_site_id:{' '}
                        <span className="font-mono font-semibold">
                          {item.dropoff_site_id || 'NULL ❌'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-3">
                <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                  <strong>💡 Solution 1:</strong> Lorsque vous créez un item, assurez-vous de
                  sélectionner un site de pickup. Les items doivent avoir un site d'origine pour
                  être visibles sur la carte et dans les missions.
                </div>
                <div className="rounded-lg bg-red-100 p-3 text-sm text-red-800">
                  <strong>🗑️ Solution 2:</strong> Si vous voulez repartir de zéro, vous pouvez
                  supprimer tous ces items et en recréer correctement.
                  <div className="mt-2">
                    <Button
                      onClick={handleDeleteAllItems}
                      disabled={isDeleting}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      {isDeleting ? '⏳ Suppression...' : '🗑️ Supprimer TOUS les items'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Items par site */}
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold">3️⃣ Items par site</h3>
          <div className="space-y-3">
            {result.sites.length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-4 text-gray-600">
                Aucun site trouvé
              </div>
            ) : (
              result.sites.map((site) => (
                <Card key={site.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold">📍 {site.name}</h4>
                    <div className="flex gap-2">
                      {site.waitingCount > 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          {site.waitingCount} en attente
                        </Badge>
                      )}
                      {site.deliveredCount > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {site.deliveredCount} livrés
                        </Badge>
                      )}
                    </div>
                  </div>

                  {site.waitingCount === 0 && site.deliveredCount === 0 && (
                    <div className="text-sm text-gray-500">Aucun item sur ce site</div>
                  )}

                  {site.waitingItems.length > 0 && (
                    <div className="mb-2">
                      <div className="mb-1 text-xs font-semibold text-yellow-700">
                        En attente de ramassage:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {site.waitingItems.map((item) => (
                          <Badge key={item.id} variant="outline" className="text-xs">
                            {item.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {site.deliveredItems.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-semibold text-green-700">
                        Items livrés à ce site:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {site.deliveredItems.map((item) => (
                          <Badge key={item.id} variant="outline" className="text-xs">
                            ✅ {item.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {/* 4. État des véhicules */}
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold">4️⃣ État des véhicules</h3>
          <div className="space-y-3">
            {result.vehicles.length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-4 text-gray-600">
                Aucun véhicule trouvé
              </div>
            ) : (
              result.vehicles.map((vehicle) => (
                <Card key={vehicle.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🚚</span>
                      <div>
                        <h4 className="font-semibold">{vehicle.name}</h4>
                        <div className="text-sm text-gray-600">
                          {vehicle.loadedCount === 0
                            ? 'Véhicule vide'
                            : `${vehicle.loadedCount} item${vehicle.loadedCount > 1 ? 's' : ''} chargé${vehicle.loadedCount > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        vehicle.loadedCount > 0
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-50 text-gray-600'
                      }
                    >
                      {vehicle.loadedCount} items
                    </Badge>
                  </div>
                  {vehicle.loadedItemIds.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      IDs: {vehicle.loadedItemIds.join(', ')}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Résumé final */}
        <div
          className={`rounded-lg p-4 ${
            result.orphanItems.length > 0
              ? 'bg-yellow-50 text-yellow-800'
              : 'bg-green-50 text-green-800'
          }`}
        >
          <div className="mb-2 text-lg font-bold">
            {result.orphanItems.length > 0
              ? '⚠️ Vérification terminée - Action requise'
              : '✅ Vérification terminée'}
          </div>
          <div className="text-sm">
            <strong>Conclusion:</strong> Les items ne sont PAS supprimés de la base de données.
            Ils sont simplement dans différents états (pending, in_transit, delivered) et sont
            affichés selon leur localisation actuelle.
            {result.orphanItems.length > 0 && (
              <>
                {' '}
                <br />
                <br />
                <strong className="text-red-700">
                  ⚠️ Attention: {result.orphanItems.length} item
                  {result.orphanItems.length > 1 ? 's' : ''} orphelin
                  {result.orphanItems.length > 1 ? 's' : ''} trouvé
                  {result.orphanItems.length > 1 ? 's' : ''}.
                </strong>{' '}
                Ces items n'ont pas de site de pickup défini. Vous devez les modifier pour leur
                assigner un site de pickup, sinon ils ne pourront pas être inclus dans les
                missions.
              </>
            )}
          </div>
        </div>

        {/* Bouton de re-vérification */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleVerify} disabled={isLoading} variant="outline">
            🔄 Actualiser
          </Button>
        </div>
      </Card>
    </div>
  );
}
