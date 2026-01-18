"""
Routes API pour les véhicules
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.database import get_db
from api.core.security import get_current_user, get_current_organization, CurrentUser
from api.domains.base.schemas import PaginationParams, SuccessResponse

from .schemas import (
    VehicleCreate,
    VehicleUpdate,
    VehicleResponse,
    VehicleListResponse,
    VehicleLocationUpdate,
    VehicleSummary,
)
from .repository import VehicleRepository
from .service import VehicleService
from .models import VehicleStatus

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


# ===================
# Dependencies
# ===================

async def get_vehicle_service(
    db: AsyncSession = Depends(get_db)
) -> VehicleService:
    """Injection de dépendance pour le service Vehicle"""
    repository = VehicleRepository(db)
    return VehicleService(repository)


# ===================
# Routes
# ===================

@router.get("", response_model=List[VehicleListResponse])
async def list_vehicles(
    status: Optional[str] = Query(None, description="Filtrer par statut"),
    vehicle_type: Optional[str] = Query(None, description="Filtrer par type"),
    is_active: Optional[bool] = Query(None, description="Filtrer par état actif"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    per_page: int = Query(20, ge=1, le=100, description="Éléments par page"),
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """
    Liste tous les véhicules de l'organisation

    - **status**: Filtrer par statut (available, in_service, maintenance, out_of_service)
    - **vehicle_type**: Filtrer par type de véhicule
    - **is_active**: Filtrer par état actif
    """
    filters = {}
    if status:
        filters["status"] = status
    if vehicle_type:
        filters["vehicle_type"] = vehicle_type
    if is_active is not None:
        filters["is_active"] = is_active

    pagination = PaginationParams(page=page, per_page=per_page)
    result = await service.get_paginated(org_id, pagination, filters)

    return result.items


@router.get("/summary", response_model=VehicleSummary)
async def get_vehicles_summary(
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """Retourne un résumé statistique des véhicules"""
    return await service.get_summary(org_id)


@router.get("/available", response_model=List[VehicleListResponse])
async def list_available_vehicles(
    vehicle_type: Optional[str] = Query(None, description="Filtrer par type"),
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """Liste les véhicules disponibles pour affectation"""
    vehicles = await service.get_available(org_id, vehicle_type)
    return vehicles


@router.get("/with-location", response_model=List[VehicleListResponse])
async def list_vehicles_with_location(
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """Liste les véhicules ayant une position GPS connue"""
    vehicles = await service.get_with_location(org_id)
    return vehicles


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: UUID,
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """Récupère les détails d'un véhicule"""
    return await service.get_by_id_or_fail(vehicle_id, org_id)


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    data: VehicleCreate,
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """Crée un nouveau véhicule"""
    return await service.create(org_id, data.model_dump(exclude_unset=True))


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: UUID,
    data: VehicleUpdate,
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """Met à jour un véhicule"""
    return await service.update(
        vehicle_id, org_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/{vehicle_id}", response_model=SuccessResponse)
async def delete_vehicle(
    vehicle_id: UUID,
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """Supprime un véhicule"""
    await service.delete(vehicle_id, org_id)
    return SuccessResponse(message=f"Véhicule {vehicle_id} supprimé avec succès")


@router.patch("/{vehicle_id}/location", response_model=VehicleResponse)
async def update_vehicle_location(
    vehicle_id: UUID,
    data: VehicleLocationUpdate,
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """Met à jour la position GPS d'un véhicule"""
    return await service.update_location(
        vehicle_id, org_id, data.latitude, data.longitude
    )


@router.patch("/{vehicle_id}/status", response_model=VehicleResponse)
async def update_vehicle_status(
    vehicle_id: UUID,
    new_status: VehicleStatus = Query(..., description="Nouveau statut"),
    org_id: UUID = Depends(get_current_organization),
    user: CurrentUser = Depends(get_current_user),
    service: VehicleService = Depends(get_vehicle_service)
):
    """Change le statut d'un véhicule"""
    return await service.change_status(vehicle_id, org_id, new_status)
