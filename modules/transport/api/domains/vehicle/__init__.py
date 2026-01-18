"""
Vehicle Domain - Gestion des véhicules
"""

from .models import Vehicle, VehicleStatus, VehicleType
from .schemas import (
    VehicleCreate,
    VehicleUpdate,
    VehicleResponse,
    VehicleListResponse,
)
from .repository import VehicleRepository
from .service import VehicleService

__all__ = [
    "Vehicle",
    "VehicleStatus",
    "VehicleType",
    "VehicleCreate",
    "VehicleUpdate",
    "VehicleResponse",
    "VehicleListResponse",
    "VehicleRepository",
    "VehicleService",
]
