"""
Service Pattern Générique
Couche de logique métier entre les routes et le repository
"""

import logging
from typing import TypeVar, Generic, Type, List, Optional, Dict, Any
from uuid import UUID

from .repository import BaseRepository
from .models import TenantBaseModel
from .schemas import PaginationParams, PaginatedResponse

logger = logging.getLogger(__name__)

# Type variables
ModelType = TypeVar("ModelType", bound=TenantBaseModel)
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)


class BaseService(Generic[ModelType, RepositoryType]):
    """
    Service générique avec opérations CRUD de base
    Encapsule la logique métier et utilise le repository pour l'accès aux données

    Usage:
        class VehicleService(BaseService[Vehicle, VehicleRepository]):
            async def assign_to_route(self, vehicle_id: UUID, route_id: UUID):
                # Logique métier spécifique
                pass
    """

    def __init__(self, repository: RepositoryType):
        self.repository = repository
        self._entity_name = repository.model.__name__

    # ===================
    # CRUD Operations
    # ===================

    async def create(
        self,
        organization_id: UUID,
        data: Dict[str, Any]
    ) -> ModelType:
        """
        Crée une nouvelle entité

        Args:
            organization_id: UUID de l'organisation
            data: Données de l'entité

        Returns:
            Entité créée
        """
        # Ajouter l'organization_id aux données
        create_data = {**data, "organization_id": organization_id}

        # Validation métier avant création (hook pour les sous-classes)
        await self._validate_create(create_data)

        # Créer l'entité
        entity = await self.repository.create(create_data)

        # Actions post-création (hook pour les sous-classes)
        await self._after_create(entity)

        logger.info(f"Created {self._entity_name} {entity.id} for org {organization_id}")
        return entity

    async def get_by_id(
        self,
        id: UUID,
        organization_id: UUID
    ) -> Optional[ModelType]:
        """Récupère une entité par son ID"""
        return await self.repository.get_by_id(id, organization_id)

    async def get_by_id_or_fail(
        self,
        id: UUID,
        organization_id: UUID
    ) -> ModelType:
        """Récupère une entité ou lève une exception"""
        return await self.repository.get_by_id_or_fail(id, organization_id)

    async def get_all(
        self,
        organization_id: UUID,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[ModelType]:
        """Récupère toutes les entités d'une organisation"""
        return await self.repository.find_by_organization(organization_id, filters)

    async def get_paginated(
        self,
        organization_id: UUID,
        pagination: PaginationParams,
        filters: Optional[Dict[str, Any]] = None
    ) -> PaginatedResponse[ModelType]:
        """Récupère les entités avec pagination"""
        return await self.repository.find_paginated(
            organization_id, pagination, filters
        )

    async def update(
        self,
        id: UUID,
        organization_id: UUID,
        data: Dict[str, Any]
    ) -> ModelType:
        """
        Met à jour une entité

        Args:
            id: UUID de l'entité
            organization_id: UUID de l'organisation
            data: Données à mettre à jour

        Returns:
            Entité mise à jour
        """
        # Récupérer l'entité existante
        existing = await self.repository.get_by_id_or_fail(id, organization_id)

        # Validation métier avant mise à jour
        await self._validate_update(existing, data)

        # Mettre à jour
        entity = await self.repository.update_or_fail(id, data, organization_id)

        # Actions post-mise à jour
        await self._after_update(entity)

        logger.info(f"Updated {self._entity_name} {id}")
        return entity

    async def delete(
        self,
        id: UUID,
        organization_id: UUID
    ) -> None:
        """
        Supprime une entité

        Args:
            id: UUID de l'entité
            organization_id: UUID de l'organisation
        """
        # Récupérer l'entité pour validation
        entity = await self.repository.get_by_id_or_fail(id, organization_id)

        # Validation métier avant suppression
        await self._validate_delete(entity)

        # Supprimer
        await self.repository.delete_or_fail(id, organization_id)

        # Actions post-suppression
        await self._after_delete(entity)

        logger.info(f"Deleted {self._entity_name} {id}")

    async def count(
        self,
        organization_id: UUID,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Compte le nombre d'entités"""
        return await self.repository.count(organization_id, filters)

    async def exists(
        self,
        id: UUID,
        organization_id: UUID
    ) -> bool:
        """Vérifie si une entité existe"""
        return await self.repository.exists(id, organization_id)

    async def search(
        self,
        organization_id: UUID,
        search_term: str,
        search_fields: List[str],
        pagination: Optional[PaginationParams] = None
    ) -> List[ModelType]:
        """Recherche textuelle"""
        return await self.repository.search(
            organization_id, search_term, search_fields, pagination
        )

    # ===================
    # Hooks pour personnalisation
    # ===================

    async def _validate_create(self, data: Dict[str, Any]) -> None:
        """
        Hook pour validation avant création
        À surcharger dans les sous-classes pour ajouter des règles métier
        """
        pass

    async def _validate_update(
        self,
        existing: ModelType,
        data: Dict[str, Any]
    ) -> None:
        """
        Hook pour validation avant mise à jour
        À surcharger dans les sous-classes
        """
        pass

    async def _validate_delete(self, entity: ModelType) -> None:
        """
        Hook pour validation avant suppression
        À surcharger dans les sous-classes
        """
        pass

    async def _after_create(self, entity: ModelType) -> None:
        """
        Hook pour actions post-création
        Ex: Envoyer une notification, mettre à jour un cache, etc.
        """
        pass

    async def _after_update(self, entity: ModelType) -> None:
        """
        Hook pour actions post-mise à jour
        """
        pass

    async def _after_delete(self, entity: ModelType) -> None:
        """
        Hook pour actions post-suppression
        """
        pass

    # ===================
    # Bulk Operations
    # ===================

    async def create_many(
        self,
        organization_id: UUID,
        items: List[Dict[str, Any]]
    ) -> List[ModelType]:
        """Crée plusieurs entités"""
        create_data = [
            {**item, "organization_id": organization_id}
            for item in items
        ]

        for data in create_data:
            await self._validate_create(data)

        entities = await self.repository.create_many(create_data)

        for entity in entities:
            await self._after_create(entity)

        return entities

    async def delete_many(
        self,
        ids: List[UUID],
        organization_id: UUID
    ) -> int:
        """Supprime plusieurs entités"""
        # Récupérer les entités pour validation
        entities = await self.repository.find_by_ids(ids, organization_id)

        for entity in entities:
            await self._validate_delete(entity)

        count = await self.repository.delete_many(ids, organization_id)

        for entity in entities:
            await self._after_delete(entity)

        return count
