"""
Schémas Pydantic pour les véhicules
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import Field

from api.domains.base.schemas import (
    BaseSchema,
    CreateSchema,
    UpdateSchema,
    TenantEntitySchema,
    PaginatedResponse,
)
from .models import VehicleStatus, VehicleType


class VehicleBase(BaseSchema):
    """Champs communs pour les véhicules"""

    name: str = Field(..., min_length=1, max_length=255, description="Nom du véhicule")
    vehicle_type: str = Field(
        default=VehicleType.OTHER.value,
        description="Type de véhicule"
    )
    registration: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Immatriculation"
    )
    capacity: Optional[int] = Field(
        default=None,
        ge=1,
        le=1000,
        description="Capacité"
    )
    capacity_unit: str = Field(default="passengers", description="Unité de capacité")


class VehicleCreate(VehicleBase, CreateSchema):
    """Schéma pour la création d'un véhicule"""

    status: str = Field(default=VehicleStatus.AVAILABLE.value)
    is_active: bool = Field(default=True)
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    color: Optional[str] = None
    equipment: List[str] = Field(default=[])
    metadata: Dict[str, Any] = Field(default={})

    # Position initiale (optionnelle)
    current_latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    current_longitude: Optional[float] = Field(default=None, ge=-180, le=180)


class VehicleUpdate(UpdateSchema):
    """Schéma pour la mise à jour d'un véhicule (tous les champs optionnels)"""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    vehicle_type: Optional[str] = None
    registration: Optional[str] = None
    capacity: Optional[int] = Field(default=None, ge=1, le=1000)
    capacity_unit: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    color: Optional[str] = None
    equipment: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class VehicleLocationUpdate(BaseSchema):
    """Schéma pour la mise à jour de la position GPS"""

    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    speed_kmh: Optional[float] = Field(default=None, ge=0)
    heading: Optional[int] = Field(default=None, ge=0, le=360)


class VehicleResponse(TenantEntitySchema):
    """Schéma de réponse pour un véhicule"""

    name: str
    vehicle_type: str
    registration: Optional[str]
    capacity: Optional[int]
    capacity_unit: str
    status: str
    is_active: bool
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    last_position_update: Optional[str]
    brand: Optional[str]
    model: Optional[str]
    year: Optional[int]
    color: Optional[str]
    equipment: List[str]
    metadata: Dict[str, Any]

    @property
    def has_location(self) -> bool:
        return self.current_latitude is not None and self.current_longitude is not None


class VehicleListResponse(BaseSchema):
    """Schéma de réponse pour une liste de véhicules"""

    id: UUID
    name: str
    vehicle_type: str
    registration: Optional[str]
    capacity: Optional[int]
    status: str
    is_active: bool
    current_latitude: Optional[float]
    current_longitude: Optional[float]


class VehicleSummary(BaseSchema):
    """Résumé statistique des véhicules"""

    total: int
    available: int
    in_service: int
    maintenance: int
    out_of_service: int
    with_location: int


# Type alias pour la pagination
VehiclePaginatedResponse = PaginatedResponse[VehicleListResponse]
