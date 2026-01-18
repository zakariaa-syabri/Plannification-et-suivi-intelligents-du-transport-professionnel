'use client';

/**
 * TEAM MANAGEMENT PAGE
 * Interface pour gérer les utilisateurs et leurs rôles
 * Permet d'inviter des chauffeurs, clients, etc.
 */

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { useUserRole, type UserType } from '~/contexts';
import { useVocabulary } from '~/contexts';
import { Icons } from '~/config/icons.config';
import { Icon } from '~/components/ui/icon';
import { inviteMemberAction } from './_actions/invite-member.action';

interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  user_type: UserType;
  is_active: boolean;
  created_at: string;
  user_email?: string;
}

interface Invitation {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  user_type: UserType;
  status: string;
  expires_at: string;
  created_at: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  user_type: UserType;
  requested_at: string;
  display_name: string | null;
  user_email: string;
  phone: string | null;
  avatar_url: string | null;
}

const USER_TYPE_CONFIG: Record<UserType, { label: string; description: string; color: string }> = {
  admin: { label: 'Administrateur', description: 'Accès complet au système', color: 'bg-purple-100 text-purple-800' },
  dispatcher: { label: 'Dispatcheur', description: 'Gère les missions et planification', color: 'bg-blue-100 text-blue-800' },
  supervisor: { label: 'Superviseur', description: 'Supervise les opérations', color: 'bg-indigo-100 text-indigo-800' },
  driver: { label: 'Chauffeur', description: 'Exécute les missions', color: 'bg-green-100 text-green-800' },
  client: { label: 'Client', description: 'Suit ses livraisons/trajets', color: 'bg-orange-100 text-orange-800' },
  staff: { label: 'Personnel', description: 'Accès limité', color: 'bg-gray-100 text-gray-800' },
};

const INVITATION_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Acceptée', color: 'bg-green-100 text-green-800' },
  expired: { label: 'Expirée', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
};

export default function TeamManagementPage() {
  const { canManageUsers, isLoading: roleLoading } = useUserRole();
  const { labels, organizationId, isLoading: vocabLoading, error: vocabError } = useVocabulary();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'requests'>('members');

  // Formulaire d'invitation
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteUserType, setInviteUserType] = useState<UserType>('driver');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInvitation, setCreatedInvitation] = useState<{
    email: string;
    invitationLink: string;
  } | null>(null);

  useEffect(() => {
    // Charger même sans organizationId pour la visualisation
    if (!vocabLoading) {
      loadData();
    }
  }, [vocabLoading]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const supabase = getSupabaseBrowserClient();

    console.log('🔍 Team loadData - organizationId:', organizationId);

    try {
      // Charger les membres de l'équipe
      let membersQuery = supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtrer par organization_id seulement s'il existe
      if (organizationId) {
        membersQuery = membersQuery.eq('organization_id', organizationId);
      }

      const { data: membersData, error: membersError } = await membersQuery;

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Charger les invitations
      let invitationsQuery = supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false});

      if (organizationId) {
        invitationsQuery = invitationsQuery.eq('organization_id', organizationId);
      }

      const { data: invitationsData, error: invitationsError } = await invitationsQuery;

      if (invitationsError && invitationsError.code !== 'PGRST116') {
        throw invitationsError;
      }
      setInvitations(invitationsData || []);

      // Charger les demandes d'adhésion en attente
      let requestsQuery = supabase
        .from('organization_join_requests')
        .select('*');

      if (organizationId) {
        requestsQuery = requestsQuery.eq('organization_id', organizationId);
      }

      const { data: requestsData, error: requestsError } = await requestsQuery;

      if (requestsError && requestsError.code !== 'PGRST116') {
        throw requestsError;
      }
      setJoinRequests(requestsData || []);
    } catch (err: any) {
      console.error('Erreur chargement équipe:', err);
      const errorMessage = err?.message || JSON.stringify(err) || 'Erreur lors du chargement de l\'équipe';
      console.error('Message d\'erreur:', errorMessage);
      console.error('OrganizationId:', organizationId);
      setLoadError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const addMemberDirectly = async () => {
    if (!inviteEmail) return;

    setInviteLoading(true);
    setInviteError(null);

    try {
      console.log('📤 [CLIENT] Appel inviteMemberAction avec:', {
        email: inviteEmail,
        user_type: inviteUserType,
      });

      const result = await inviteMemberAction({
        email: inviteEmail,
        phone: invitePhone || undefined,
        user_type: inviteUserType,
      });

      console.log('📥 [CLIENT] Résultat inviteMemberAction:', result);

      if (!result.success || result.error) {
        const errorMsg = result.error || 'Erreur lors de l\'ajout du membre';
        console.error('❌ [CLIENT] Erreur:', errorMsg);
        setInviteError(errorMsg);
        return;
      }

      console.log('✅ [CLIENT] Invitation créée:', result.invitation);

      // Stocker l'invitation créée pour afficher le lien
      setCreatedInvitation({
        email: result.invitation.email,
        invitationLink: result.invitation.invitationLink,
      });

      // Réinitialiser le formulaire
      setInviteEmail('');
      setInvitePhone('');
      setInviteUserType('driver');

      // Recharger les données
      loadData();
    } catch (err: any) {
      console.error('❌ [CLIENT] Exception:', err);
      const errorMsg = err?.message || 'Erreur lors de l\'ajout du membre';
      console.error('Détails erreur:', errorMsg);
      setInviteError(errorMsg);
    } finally {
      setInviteLoading(false);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    const supabase = getSupabaseBrowserClient();

    try {
      await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      loadData();
    } catch (err) {
      console.error('Erreur annulation invitation:', err);
    }
  };

  const updateMemberType = async (memberId: string, newType: UserType) => {
    const supabase = getSupabaseBrowserClient();

    try {
      await supabase
        .from('user_profiles')
        .update({ user_type: newType })
        .eq('id', memberId);

      loadData();
    } catch (err) {
      console.error('Erreur mise à jour type:', err);
    }
  };

  const toggleMemberActive = async (memberId: string, isActive: boolean) => {
    const supabase = getSupabaseBrowserClient();

    try {
      await supabase
        .from('user_profiles')
        .update({ is_active: isActive })
        .eq('id', memberId);

      loadData();
    } catch (err) {
      console.error('Erreur toggle actif:', err);
    }
  };

  const approveJoinRequest = async (requestId: string) => {
    if (!organizationId) return;

    const supabase = getSupabaseBrowserClient();

    try {
      // Appeler la fonction RPC pour approuver la demande
      const { error } = await supabase.rpc('approve_member_request', {
        p_member_id: requestId,
        p_organization_id: organizationId,
      });

      if (error) throw error;

      // Recharger les données
      loadData();
    } catch (err) {
      console.error('Erreur approbation demande:', err);
      alert('Erreur lors de l\'approbation de la demande');
    }
  };

  const rejectJoinRequest = async (requestId: string) => {
    if (!organizationId) return;
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette demande ?')) return;

    const supabase = getSupabaseBrowserClient();

    try {
      // Appeler la fonction RPC pour rejeter la demande
      const { error } = await supabase.rpc('reject_member_request', {
        p_member_id: requestId,
        p_organization_id: organizationId,
      });

      if (error) throw error;

      // Recharger les données
      loadData();
    } catch (err) {
      console.error('Erreur rejet demande:', err);
      alert('Erreur lors du rejet de la demande');
    }
  };

  if (roleLoading || vocabLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon icon={Icons.ui.loading} size="xl" className="animate-spin" />
      </div>
    );
  }

  // Temporairement désactivé pour visualisation
  // if (!organizationId) {
  //   return (
  //     <div className="p-8 text-center">
  //       <Icon icon={Icons.status.alert} size="xl" className="mx-auto mb-4 text-red-500" />
  //       <h2 className="text-xl font-semibold mb-2">Organisation non trouvée</h2>
  //       <p className="text-muted-foreground mb-4">
  //         {vocabError?.message || 'Vous ne faites partie d\'aucune organisation. Contactez votre administrateur.'}
  //       </p>
  //       <Button onClick={() => window.location.reload()}>Recharger</Button>
  //     </div>
  //   );
  // }

  // if (!canManageUsers) {
  //   return (
  //     <div className="p-8 text-center">
  //       <Icon icon={Icons.security.lock} size="xl" className="mx-auto mb-4 text-muted-foreground" />
  //       <h2 className="text-xl font-semibold mb-2">Accès restreint</h2>
  //       <p className="text-muted-foreground">
  //         Vous n'avez pas les permissions pour gérer l'équipe.
  //       </p>
  //     </div>
  //   );
  // }

  if (loadError) {
    return (
      <div className="p-8 text-center">
        <Icon icon={Icons.status.alert} size="xl" className="mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
        <p className="text-muted-foreground mb-4">{loadError}</p>
        <Button onClick={loadData}>Réessayer</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon icon={Icons.ui.loading} size="xl" className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gestion de l'équipe</h1>
          <p className="text-muted-foreground">
            Gérez les membres de votre organisation et leurs rôles
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <Icon icon={Icons.action.add} size="sm" className="mr-2" />
          Ajouter un membre
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{members.length}</div>
            <div className="text-sm text-muted-foreground">Membres</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {members.filter(m => m.user_type === 'driver').length}
            </div>
            <div className="text-sm text-muted-foreground">Chauffeurs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {members.filter(m => m.user_type === 'client').length}
            </div>
            <div className="text-sm text-muted-foreground">Clients</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {invitations.filter(i => i.status === 'pending').length}
            </div>
            <div className="text-sm text-muted-foreground">Invitations en attente</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'members'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('members')}
        >
          Membres ({members.length})
        </button>
        <button
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'invitations'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('invitations')}
        >
          Invitations ({invitations.length})
        </button>
        <button
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'requests'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('requests')}
        >
          Demandes en attente ({joinRequests.length})
          {joinRequests.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {joinRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Liste des membres */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {members.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Icon icon={Icons.navigation.team} size="xl" className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Aucun membre dans l'équipe. Invitez votre premier membre !
                </p>
              </CardContent>
            </Card>
          ) : (
            members.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                      ) : (
                        <Icon icon={Icons.cargo.passenger} size="lg" className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.display_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Sans nom'}
                        </span>
                        {!member.is_active && (
                          <Badge variant="outline" className="text-xs">Inactif</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.phone || 'Pas de téléphone'}
                      </div>
                    </div>
                    <Badge className={USER_TYPE_CONFIG[member.user_type]?.color}>
                      {USER_TYPE_CONFIG[member.user_type]?.label}
                    </Badge>
                    <div className="flex gap-2">
                      <select
                        className="text-sm border rounded px-2 py-1"
                        value={member.user_type}
                        onChange={(e) => updateMemberType(member.id, e.target.value as UserType)}
                      >
                        {Object.entries(USER_TYPE_CONFIG).map(([type, config]) => (
                          <option key={type} value={type}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMemberActive(member.id, !member.is_active)}
                      >
                        {member.is_active ? 'Désactiver' : 'Activer'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Liste des invitations */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Icon icon={Icons.communication.mail} size="xl" className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Aucune invitation envoyée.
                </p>
              </CardContent>
            </Card>
          ) : (
            invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Icon icon={Icons.communication.mail} size="lg" className="text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Envoyée le {new Date(invitation.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <Badge className={USER_TYPE_CONFIG[invitation.user_type]?.color}>
                      {USER_TYPE_CONFIG[invitation.user_type]?.label}
                    </Badge>
                    <Badge className={INVITATION_STATUS[invitation.status]?.color}>
                      {INVITATION_STATUS[invitation.status]?.label}
                    </Badge>
                    {invitation.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelInvitation(invitation.id)}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Liste des demandes en attente */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {joinRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Icon icon={Icons.navigation.team} size="xl" className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Aucune demande d'adhésion en attente.
                </p>
              </CardContent>
            </Card>
          ) : (
            joinRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                        {request.display_name?.charAt(0) || request.user_email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {request.display_name || 'Nouvel utilisateur'}
                        </h3>
                        <p className="text-sm text-muted-foreground">{request.user_email}</p>
                        {request.phone && (
                          <p className="text-xs text-muted-foreground">📱 {request.phone}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge className={USER_TYPE_CONFIG[request.user_type].color}>
                            {USER_TYPE_CONFIG[request.user_type].label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Demandé le {new Date(request.requested_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveJoinRequest(request.id)}
                      >
                        <Icon icon={Icons.action.check} size="sm" className="mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectJoinRequest(request.id)}
                      >
                        <Icon icon={Icons.action.delete} size="sm" className="mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal d'ajout de membre */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {createdInvitation ? 'Invitation créée ✅' : 'Ajouter un membre'}
              </CardTitle>
              <CardDescription>
                {createdInvitation
                  ? 'Partagez ce lien avec le nouveau membre'
                  : 'Ajoutez directement un nouveau membre à votre équipe'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {createdInvitation ? (
                // Affichage du lien d'invitation
                <>
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                      ✅ Invitation créée pour:
                    </p>
                    <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                      {createdInvitation.email}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invitationLink">Lien d'invitation:</Label>
                    <div className="flex gap-2">
                      <Input
                        id="invitationLink"
                        type="text"
                        readOnly
                        value={createdInvitation.invitationLink}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(createdInvitation.invitationLink);
                          alert('Lien copié dans le presse-papiers!');
                        }}
                      >
                        📋 Copier
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      <strong>📧 Partagez ce lien:</strong> Le nouveau membre peut cliquer sur ce lien pour créer son compte avec email et mot de passe.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => {
                        setCreatedInvitation(null);
                        setShowInviteModal(false);
                      }}
                    >
                      Fermer
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setCreatedInvitation(null);
                      }}
                    >
                      Ajouter un autre membre
                    </Button>
                  </div>
                </>
              ) : (
                // Formulaire d'invitation
                <>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemple.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="userType">Type d'utilisateur</Label>
                    <select
                      id="userType"
                      className="w-full border rounded-md px-3 py-2 mt-1"
                      value={inviteUserType}
                      onChange={(e) => setInviteUserType(e.target.value as UserType)}
                    >
                      {Object.entries(USER_TYPE_CONFIG).map(([type, config]) => (
                        <option key={type} value={type}>
                          {config.label} - {config.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {inviteError && (
                    <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                      {inviteError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowInviteModal(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={addMemberDirectly}
                      disabled={!inviteEmail || inviteLoading}
                    >
                      {inviteLoading ? (
                        <Icon icon={Icons.ui.loading} size="sm" className="animate-spin mr-2" />
                      ) : (
                        <Icon icon={Icons.action.add} size="sm" className="mr-2" />
                      )}
                      Ajouter le membre
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
