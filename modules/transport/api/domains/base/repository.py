"""
Repository Pattern Générique
Abstraction de la couche d'accès aux données avec support multi-tenant
"""

import logging
from typing import TypeVar, Generic, Type, List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select, update, delete, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.core.exceptions import NotFoundError, DatabaseError
from .models import TenantBaseModel
from .schemas import PaginationParams, PaginatedResponse

logger = logging.getLogger(__name__)

# Type variables pour le générique
ModelType = TypeVar("ModelType", bound=TenantBaseModel)


class BaseRepository(Generic[ModelType]):
    """
    Repository générique avec opérations CRUD de base
    Support multi-tenant intégré

    Usage:
        class VehicleRepository(BaseRepository[Vehicle]):
            pass

        repo = VehicleRepository(Vehicle, session)
        vehicles = await repo.find_by_organization(org_id)
    """

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session
        self._model_name = model.__name__

    # ===================
    # Create
    # ===================

    async def create(self, data: Dict[str, Any]) -> ModelType:
        """
        Crée une nouvelle entité

        Args:
            data: Dictionnaire des données

        Returns:
            Entité créée
        """
        try:
            entity = self.model(**data)
            self.session.add(entity)
            await self.session.flush()
            await self.session.refresh(entity)
            logger.debug(f"Created {self._model_name} with id {entity.id}")
            return entity
        except Exception as e:
            logger.error(f"Error creating {self._model_name}: {e}")
            raise DatabaseError(
                f"Erreur lors de la création de {self._model_name}",
                operation="create"
            )

    async def create_many(self, items: List[Dict[str, Any]]) -> List[ModelType]:
        """Crée plusieurs entités en une seule transaction"""
        try:
            entities = [self.model(**data) for data in items]
            self.session.add_all(entities)
            await self.session.flush()
            for entity in entities:
                await self.session.refresh(entity)
            return entities
        except Exception as e:
            logger.error(f"Error creating multiple {self._model_name}: {e}")
            raise DatabaseError(
                f"Erreur lors de la création multiple de {self._model_name}",
                operation="create_many"
            )

    # ===================
    # Read
    # ===================

    async def get_by_id(
        self,
        id: UUID,
        organization_id: Optional[UUID] = None
    ) -> Optional[ModelType]:
        """
        Récupère une entité par son ID

        Args:
            id: UUID de l'entité
            organization_id: Filtre optionnel par organisation

        Returns:
            Entité ou None si non trouvée
        """
        query = select(self.model).where(self.model.id == id)

        if organization_id:
            query = query.where(self.model.organization_id == organization_id)

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_or_fail(
        self,
        id: UUID,
        organization_id: Optional[UUID] = None
    ) -> ModelType:
        """
        Récupère une entité par son ID ou lève une exception

        Raises:
            NotFoundError: Si l'entité n'existe pas
        """
        entity = await self.get_by_id(id, organization_id)
        if entity is None:
            raise NotFoundError(self._model_name, str(id))
        return entity

    async def find_by_organization(
        self,
        organization_id: UUID,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[ModelType]:
        """
        Récupère toutes les entités d'une organisation

        Args:
            organization_id: UUID de l'organisation
            filters: Filtres additionnels (champ=valeur)

        Returns:
            Liste des entités
        """
        query = select(self.model).where(
            self.model.organization_id == organization_id
        )

        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.where(getattr(self.model, field) == value)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def find_paginated(
        self,
        organization_id: UUID,
        pagination: PaginationParams,
        filters: Optional[Dict[str, Any]] = None
    ) -> PaginatedResponse[ModelType]:
        """
        Récupère les entités avec pagination

        Args:
            organization_id: UUID de l'organisation
            pagination: Paramètres de pagination
            filters: Filtres additionnels

        Returns:
            Réponse paginée
        """
        # Query de base
        base_query = select(self.model).where(
            self.model.organization_id == organization_id
        )

        # Appliquer les filtres
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    base_query = base_query.where(getattr(self.model, field) == value)

        # Compter le total
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        # Appliquer le tri
        if pagination.sort_by and hasattr(self.model, pagination.sort_by):
            sort_column = getattr(self.model, pagination.sort_by)
            if pagination.sort_order == "desc":
                sort_column = sort_column.desc()
            base_query = base_query.order_by(sort_column)
        else:
            base_query = base_query.order_by(self.model.created_at.desc())

        # Appliquer la pagination
        query = base_query.offset(pagination.offset).limit(pagination.per_page)

        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return PaginatedResponse.create(
            items=items,
            total=total,
            page=pagination.page,
            per_page=pagination.per_page
        )

    async def find_by_ids(
        self,
        ids: List[UUID],
        organization_id: Optional[UUID] = None
    ) -> List[ModelType]:
        """Récupère plusieurs entités par leurs IDs"""
        query = select(self.model).where(self.model.id.in_(ids))

        if organization_id:
            query = query.where(self.model.organization_id == organization_id)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def exists(
        self,
        id: UUID,
        organization_id: Optional[UUID] = None
    ) -> bool:
        """Vérifie si une entité existe"""
        query = select(func.count()).where(self.model.id == id)

        if organization_id:
            query = query.where(self.model.organization_id == organization_id)

        result = await self.session.execute(query)
        return (result.scalar() or 0) > 0

    async def count(
        self,
        organization_id: UUID,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Compte le nombre d'entités"""
        query = select(func.count()).where(
            self.model.organization_id == organization_id
        )

        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.where(getattr(self.model, field) == value)

        result = await self.session.execute(query)
        return result.scalar() or 0

    # ===================
    # Update
    # ===================

    async def update(
        self,
        id: UUID,
        data: Dict[str, Any],
        organization_id: Optional[UUID] = None
    ) -> Optional[ModelType]:
        """
        Met à jour une entité

        Args:
            id: UUID de l'entité
            data: Données à mettre à jour
            organization_id: Filtre optionnel par organisation

        Returns:
            Entité mise à jour ou None
        """
        # Filtrer les valeurs None du dictionnaire
        update_data = {k: v for k, v in data.items() if v is not None}

        if not update_data:
            return await self.get_by_id(id, organization_id)

        conditions = [self.model.id == id]
        if organization_id:
            conditions.append(self.model.organization_id == organization_id)

        query = (
            update(self.model)
            .where(and_(*conditions))
            .values(**update_data)
            .returning(self.model)
        )

        try:
            result = await self.session.execute(query)
            await self.session.flush()
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error updating {self._model_name} {id}: {e}")
            raise DatabaseError(
                f"Erreur lors de la mise à jour de {self._model_name}",
                operation="update"
            )

    async def update_or_fail(
        self,
        id: UUID,
        data: Dict[str, Any],
        organization_id: Optional[UUID] = None
    ) -> ModelType:
        """Met à jour une entité ou lève une exception si non trouvée"""
        entity = await self.update(id, data, organization_id)
        if entity is None:
            raise NotFoundError(self._model_name, str(id))
        return entity

    # ===================
    # Delete
    # ===================

    async def delete(
        self,
        id: UUID,
        organization_id: Optional[UUID] = None
    ) -> bool:
        """
        Supprime une entité

        Args:
            id: UUID de l'entité
            organization_id: Filtre optionnel par organisation

        Returns:
            True si supprimé, False sinon
        """
        conditions = [self.model.id == id]
        if organization_id:
            conditions.append(self.model.organization_id == organization_id)

        query = delete(self.model).where(and_(*conditions))

        try:
            result = await self.session.execute(query)
            return result.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting {self._model_name} {id}: {e}")
            raise DatabaseError(
                f"Erreur lors de la suppression de {self._model_name}",
                operation="delete"
            )

    async def delete_or_fail(
        self,
        id: UUID,
        organization_id: Optional[UUID] = None
    ) -> None:
        """Supprime une entité ou lève une exception"""
        deleted = await self.delete(id, organization_id)
        if not deleted:
            raise NotFoundError(self._model_name, str(id))

    async def delete_many(
        self,
        ids: List[UUID],
        organization_id: Optional[UUID] = None
    ) -> int:
        """Supprime plusieurs entités"""
        conditions = [self.model.id.in_(ids)]
        if organization_id:
            conditions.append(self.model.organization_id == organization_id)

        query = delete(self.model).where(and_(*conditions))
        result = await self.session.execute(query)
        return result.rowcount

    # ===================
    # Search
    # ===================

    async def search(
        self,
        organization_id: UUID,
        search_term: str,
        search_fields: List[str],
        pagination: Optional[PaginationParams] = None
    ) -> List[ModelType]:
        """
        Recherche textuelle sur plusieurs champs

        Args:
            organization_id: UUID de l'organisation
            search_term: Terme de recherche
            search_fields: Champs à rechercher
            pagination: Paramètres de pagination optionnels
        """
        conditions = [self.model.organization_id == organization_id]

        # Construire la condition de recherche
        search_conditions = []
        for field_name in search_fields:
            if hasattr(self.model, field_name):
                field = getattr(self.model, field_name)
                search_conditions.append(field.ilike(f"%{search_term}%"))

        if search_conditions:
            conditions.append(or_(*search_conditions))

        query = select(self.model).where(and_(*conditions))

        if pagination:
            query = query.offset(pagination.offset).limit(pagination.per_page)

        result = await self.session.execute(query)
        return list(result.scalars().all())
