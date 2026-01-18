"""
Service pour les véhicules
"""

import logging
from typing import List, Optional, Dict, Any
from uuid import UUID

from api.core.exceptions import ValidationError, ConflictError
from api.domains.base.service import BaseService
from .models import Vehicle, VehicleStatus
from .repository import VehicleRepository
from .schemas import VehicleSummary

logger = logging.getLogger(__name__)


class VehicleService(BaseService[Vehicle, VehicleRepository]):
    """
    Service métier pour les véhicules
    Gère la logique métier spécifique aux véhicules
    """

    def __init__(self, repository: VehicleRepository):
        super().__init__(repository)

    # ===================
    # Validation Hooks
    # ===================

    async def _validate_create(self, data: Dict[str, Any]) -> None:
        """Validation avant création"""
        # Vérifier l'unicité de l'immatriculation
        if data.get("registration"):
            existing = await self.repository.find_by_registration(
                data["registration"],
                data.get("organization_id")
            )
            if existing:
                raise ConflictError(
                    f"Un véhicule avec l'immatriculation '{data['registration']}' existe déjà",
                    resource="vehicle"
                )

        # Validation de la capacité
        if data.get("capacity") and data["capacity"] < 1:
            raise ValidationError(
                "La capacité doit être supérieure à 0",
                field="capacity"
            )

    async def _validate_update(
        self,
        existing: Vehicle,
        data: Dict[str, Any]
    ) -> None:
        """Validation avant mise à jour"""
        # Vérifier l'unicité de l'immatriculation si elle change
        new_registration = data.get("registration")
        if new_registration and new_registration != existing.registration:
            other = await self.repository.find_by_registration(
                new_registration,
                existing.organization_id
            )
            if other and other.id != existing.id:
                raise ConflictError(
                    f"Un véhicule avec l'immatriculation '{new_registration}' existe déjà",
                    resource="vehicle"
                )

    async def _validate_delete(self, entity: Vehicle) -> None:
        """Validation avant suppression"""
        # Vérifier que le véhicule n'est pas en service
        if entity.status == VehicleStatus.IN_SERVICE.value:
            raise ValidationError(
                "Impossible de supprimer un véhicule en service",
                field="status"
            )

    # ===================
    # Methods spécifiques
    # ===================

    async def get_available(
        self,
        organization_id: UUID,
        vehicle_type: Optional[str] = None
    ) -> List[Vehicle]:
        """
        Récupère les véhicules disponibles

        Args:
            organization_id: UUID de l'organisation
            vehicle_type: Filtre optionnel par type

        Returns:
            Liste des véhicules disponibles
        """
        return await self.repository.find_available(organization_id, vehicle_type)

    async def get_with_location(
        self,
        organization_id: UUID
    ) -> List[Vehicle]:
        """
        Récupère les véhicules ayant une position GPS

        Args:
            organization_id: UUID de l'organisation

        Returns:
            Liste des véhicules avec position
        """
        return await self.repository.find_with_location(organization_id)

    async def get_in_area(
        self,
        organization_id: UUID,
        center_lat: float,
        center_lon: float,
        radius_km: float
    ) -> List[Vehicle]:
        """
        Récupère les véhicules dans un rayon autour d'un point

        Args:
            organization_id: UUID de l'organisation
            center_lat: Latitude du centre
            center_lon: Longitude du centre
            radius_km: Rayon en kilomètres

        Returns:
            Liste des véhicules dans la zone
        """
        # Approximation: 1 degré ≈ 111 km
        delta = radius_km / 111.0

        vehicles = await self.repository.find_in_area(
            organization_id,
            min_lat=center_lat - delta,
            max_lat=center_lat + delta,
            min_lon=center_lon - delta,
            max_lon=center_lon + delta
        )

        # Filtrer par distance exacte (Haversine)
        from api.services.optimization.distance import haversine_distance

        result = []
        for vehicle in vehicles:
            if vehicle.has_location:
                distance = haversine_distance(
                    (center_lat, center_lon),
                    vehicle.location
                )
                if distance <= radius_km:
                    result.append(vehicle)

        return result

    async def update_location(
        self,
        vehicle_id: UUID,
        organization_id: UUID,
        latitude: float,
        longitude: float
    ) -> Vehicle:
        """
        Met à jour la position GPS d'un véhicule

        Args:
            vehicle_id: UUID du véhicule
            organization_id: UUID de l'organisation
            latitude: Latitude
            longitude: Longitude

        Returns:
            Véhicule mis à jour
        """
        # Vérifier que le véhicule existe
        await self.repository.get_by_id_or_fail(vehicle_id, organization_id)

        vehicle = await self.repository.update_location(
            vehicle_id, latitude, longitude, organization_id
        )

        logger.debug(f"Updated location for vehicle {vehicle_id}: ({latitude}, {longitude})")
        return vehicle

    async def change_status(
        self,
        vehicle_id: UUID,
        organization_id: UUID,
        new_status: VehicleStatus
    ) -> Vehicle:
        """
        Change le statut d'un véhicule

        Args:
            vehicle_id: UUID du véhicule
            organization_id: UUID de l'organisation
            new_status: Nouveau statut

        Returns:
            Véhicule mis à jour
        """
        vehicle = await self.repository.get_by_id_or_fail(vehicle_id, organization_id)

        # Validation des transitions de statut
        current_status = VehicleStatus(vehicle.status)

        # Règles de transition
        invalid_transitions = {
            VehicleStatus.OUT_OF_SERVICE: [VehicleStatus.IN_SERVICE],  # Ne peut pas passer directement en service
        }

        if current_status in invalid_transitions:
            if new_status in invalid_transitions[current_status]:
                raise ValidationError(
                    f"Transition de statut invalide: {current_status.value} -> {new_status.value}",
                    field="status"
                )

        updated = await self.repository.update_status(
            vehicle_id, new_status, organization_id
        )

        logger.info(f"Vehicle {vehicle_id} status changed: {current_status.value} -> {new_status.value}")
        return updated

    async def get_summary(
        self,
        organization_id: UUID
    ) -> VehicleSummary:
        """
        Retourne un résumé statistique des véhicules

        Args:
            organization_id: UUID de l'organisation

        Returns:
            Résumé statistique
        """
        stats = await self.repository.get_summary(organization_id)
        return VehicleSummary(**stats)

    async def assign_to_route(
        self,
        vehicle_id: UUID,
        route_id: UUID,
        organization_id: UUID
    ) -> Vehicle:
        """
        Assigne un véhicule à une route

        Args:
            vehicle_id: UUID du véhicule
            route_id: UUID de la route
            organization_id: UUID de l'organisation

        Returns:
            Véhicule mis à jour
        """
        vehicle = await self.repository.get_by_id_or_fail(vehicle_id, organization_id)

        # Vérifier que le véhicule est disponible
        if vehicle.status != VehicleStatus.AVAILABLE.value:
            raise ValidationError(
                f"Le véhicule n'est pas disponible (statut: {vehicle.status})",
                field="status"
            )

        # Mettre à jour le statut
        updated = await self.repository.update(
            vehicle_id,
            {"status": VehicleStatus.IN_SERVICE.value},
            organization_id
        )

        logger.info(f"Vehicle {vehicle_id} assigned to route {route_id}")
        return updated

    async def release_from_route(
        self,
        vehicle_id: UUID,
        organization_id: UUID
    ) -> Vehicle:
        """
        Libère un véhicule d'une route

        Args:
            vehicle_id: UUID du véhicule
            organization_id: UUID de l'organisation

        Returns:
            Véhicule mis à jour
        """
        vehicle = await self.repository.get_by_id_or_fail(vehicle_id, organization_id)

        if vehicle.status != VehicleStatus.IN_SERVICE.value:
            raise ValidationError(
                "Le véhicule n'est pas en service",
                field="status"
            )

        updated = await self.repository.update(
            vehicle_id,
            {"status": VehicleStatus.AVAILABLE.value},
            organization_id
        )

        logger.info(f"Vehicle {vehicle_id} released from route")
        return updated
