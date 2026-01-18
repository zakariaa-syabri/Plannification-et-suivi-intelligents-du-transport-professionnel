"""
Schémas Pydantic pour les sites
"""

from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import Field, field_validator

from api.domains.base.schemas import (
    BaseSchema,
    CreateSchema,
    UpdateSchema,
    TenantEntitySchema,
)
from .models import SiteType


class SiteBase(BaseSchema):
    """Champs communs pour les sites"""

    name: str = Field(..., min_length=1, max_length=255, description="Nom du site")
    site_type: str = Field(default=SiteType.OTHER.value, description="Type de site")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")


class SiteCreate(SiteBase, CreateSchema):
    """Schéma pour la création d'un site"""

    code: Optional[str] = Field(default=None, max_length=50)
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "France"
    is_active: bool = True
    is_depot: bool = False
    opening_time: Optional[str] = Field(
        default=None,
        pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$",
        description="Heure d'ouverture (HH:MM)"
    )
    closing_time: Optional[str] = Field(
        default=None,
        pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$",
        description="Heure de fermeture (HH:MM)"
    )
    service_time_minutes: float = Field(default=5.0, ge=0)
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    metadata: Dict[str, Any] = Field(default={})


class SiteUpdate(UpdateSchema):
    """Schéma pour la mise à jour d'un site"""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    site_type: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    is_active: Optional[bool] = None
    is_depot: Optional[bool] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    service_time_minutes: Optional[float] = Field(default=None, ge=0)
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class SiteResponse(TenantEntitySchema):
    """Schéma de réponse pour un site"""

    name: str
    site_type: str
    code: Optional[str]
    address: Optional[str]
    city: Optional[str]
    postal_code: Optional[str]
    country: str
    latitude: float
    longitude: float
    is_active: bool
    is_depot: bool
    opening_time: Optional[str]
    closing_time: Optional[str]
    service_time_minutes: float
    contact_name: Optional[str]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    metadata: Dict[str, Any]


class SiteListResponse(BaseSchema):
    """Schéma de réponse pour une liste de sites"""

    id: UUID
    name: str
    site_type: str
    address: Optional[str]
    latitude: float
    longitude: float
    is_active: bool
    is_depot: bool


class SiteSummary(BaseSchema):
    """Résumé statistique des sites"""

    total: int
    active: int
    depots: int
    by_type: Dict[str, int]
