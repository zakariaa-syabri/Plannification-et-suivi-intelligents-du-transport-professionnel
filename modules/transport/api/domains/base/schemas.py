"""
Schémas Pydantic de base pour l'API
Définit les structures de données pour les requêtes et réponses
"""

from datetime import datetime
from typing import TypeVar, Generic, List, Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# Type générique pour les schémas
T = TypeVar("T")


class BaseSchema(BaseModel):
    """Schéma de base avec configuration commune"""

    model_config = ConfigDict(
        from_attributes=True,  # Permet la conversion depuis ORM
        populate_by_name=True,  # Permet l'utilisation des alias
        str_strip_whitespace=True,  # Strip les espaces des strings
    )


class CreateSchema(BaseSchema):
    """Schéma de base pour la création d'entités"""
    pass


class UpdateSchema(BaseSchema):
    """Schéma de base pour la mise à jour d'entités (tous les champs optionnels)"""
    pass


class EntitySchema(BaseSchema):
    """Schéma de base pour les entités avec ID et timestamps"""

    id: UUID
    created_at: datetime
    updated_at: datetime


class TenantEntitySchema(EntitySchema):
    """Schéma pour les entités multi-tenant"""

    organization_id: UUID


class PaginationParams(BaseModel):
    """Paramètres de pagination"""

    page: int = Field(default=1, ge=1, description="Numéro de page")
    per_page: int = Field(default=20, ge=1, le=100, description="Éléments par page")
    sort_by: Optional[str] = Field(default=None, description="Champ de tri")
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$", description="Ordre de tri")

    @property
    def offset(self) -> int:
        """Calcule l'offset pour la requête SQL"""
        return (self.page - 1) * self.per_page


class PaginatedResponse(BaseSchema, Generic[T]):
    """Réponse paginée générique"""

    items: List[T]
    total: int = Field(description="Nombre total d'éléments")
    page: int = Field(description="Page actuelle")
    per_page: int = Field(description="Éléments par page")
    pages: int = Field(description="Nombre total de pages")

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int,
        per_page: int
    ) -> "PaginatedResponse[T]":
        """Factory method pour créer une réponse paginée"""
        pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages
        )


class BulkOperationResult(BaseSchema):
    """Résultat d'une opération en masse"""

    success_count: int = Field(description="Nombre d'opérations réussies")
    error_count: int = Field(description="Nombre d'erreurs")
    errors: List[dict] = Field(default=[], description="Détails des erreurs")


class FilterParams(BaseSchema):
    """Paramètres de filtrage génériques"""

    search: Optional[str] = Field(default=None, description="Recherche textuelle")
    status: Optional[str] = Field(default=None, description="Filtre par statut")
    created_after: Optional[datetime] = Field(default=None, description="Créé après")
    created_before: Optional[datetime] = Field(default=None, description="Créé avant")


class SortParams(BaseSchema):
    """Paramètres de tri"""

    field: str = Field(default="created_at", description="Champ de tri")
    order: str = Field(default="desc", pattern="^(asc|desc)$", description="Ordre")


class SuccessResponse(BaseSchema):
    """Réponse de succès générique"""

    success: bool = True
    message: str


class ErrorResponse(BaseSchema):
    """Réponse d'erreur"""

    success: bool = False
    error: dict = Field(description="Détails de l'erreur")


class HealthCheckResponse(BaseSchema):
    """Réponse du health check"""

    status: str = Field(description="État du service")
    version: str = Field(description="Version de l'API")
    database: bool = Field(description="État de la base de données")
    mqtt: Optional[bool] = Field(default=None, description="État du broker MQTT")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ===================
# Schemas pour les coordonnées GPS
# ===================

class CoordinatesSchema(BaseSchema):
    """Schéma pour les coordonnées GPS"""

    latitude: float = Field(ge=-90, le=90, description="Latitude")
    longitude: float = Field(ge=-180, le=180, description="Longitude")


class AddressSchema(BaseSchema):
    """Schéma pour une adresse complète"""

    street: Optional[str] = Field(default=None, description="Rue et numéro")
    city: Optional[str] = Field(default=None, description="Ville")
    postal_code: Optional[str] = Field(default=None, description="Code postal")
    country: str = Field(default="France", description="Pays")
    coordinates: Optional[CoordinatesSchema] = Field(default=None, description="Coordonnées GPS")


class GeoPointSchema(BaseSchema):
    """Point géographique avec métadonnées"""

    latitude: float
    longitude: float
    address: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None


# ===================
# Schemas pour les time windows
# ===================

class TimeWindowSchema(BaseSchema):
    """Fenêtre temporelle"""

    start: datetime = Field(description="Début de la fenêtre")
    end: datetime = Field(description="Fin de la fenêtre")


class TimeRangeSchema(BaseSchema):
    """Plage horaire (heures uniquement)"""

    start_time: str = Field(pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Heure de début (HH:MM)")
    end_time: str = Field(pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Heure de fin (HH:MM)")
