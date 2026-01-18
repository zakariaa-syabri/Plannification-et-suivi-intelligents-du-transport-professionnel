"""
Repository pour les véhicules
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.domains.base.repository import BaseRepository
from .models import Vehicle, VehicleStatus


class VehicleRepository(BaseRepository[Vehicle]):
    """
    Repository spécialisé pour les véhicules
    Hérite de BaseRepository et ajoute des méthodes spécifiques
    """

    def __init__(self, session: AsyncSession):
        super().__init__(Vehicle, session)

    async def find_available(
        self,
        organization_id: UUID,
        vehicle_type: Optional[str] = None
    ) -> List[Vehicle]:
        """
        Trouve tous les véhicules disponibles

        Args:
            organization_id: UUID de l'organisation
            vehicle_type: Filtre optionnel par type

        Returns:
            Liste des véhicules disponibles
        """
        query = select(Vehicle).where(
            Vehicle.organization_id == organization_id,
            Vehicle.status == VehicleStatus.AVAILABLE.value,
            Vehicle.is_active == True
        )

        if vehicle_type:
            query = query.where(Vehicle.vehicle_type == vehicle_type)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def find_by_registration(
        self,
        registration: str,
        organization_id: Optional[UUID] = None
    ) -> Optional[Vehicle]:
        """
        Trouve un véhicule par son immatriculation

        Args:
            registration: Immatriculation du véhicule
            organization_id: Filtre optionnel par organisation

        Returns:
            Véhicule ou None
        """
        query = select(Vehicle).where(Vehicle.registration == registration)

        if organization_id:
            query = query.where(Vehicle.organization_id == organization_id)

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def find_with_location(
        self,
        organization_id: UUID
    ) -> List[Vehicle]:
        """
        Trouve tous les véhicules ayant une position GPS

        Args:
            organization_id: UUID de l'organisation

        Returns:
            Liste des véhicules avec position
        """
        query = select(Vehicle).where(
            Vehicle.organization_id == organization_id,
            Vehicle.current_latitude.isnot(None),
            Vehicle.current_longitude.isnot(None),
            Vehicle.is_active == True
        )

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def find_in_area(
        self,
        organization_id: UUID,
        min_lat: float,
        max_lat: float,
        min_lon: float,
        max_lon: float
    ) -> List[Vehicle]:
        """
        Trouve les véhicules dans une zone géographique

        Args:
            organization_id: UUID de l'organisation
            min_lat, max_lat, min_lon, max_lon: Limites de la zone

        Returns:
            Liste des véhicules dans la zone
        """
        query = select(Vehicle).where(
            Vehicle.organization_id == organization_id,
            Vehicle.current_latitude.between(min_lat, max_lat),
            Vehicle.current_longitude.between(min_lon, max_lon),
            Vehicle.is_active == True
        )

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_summary(self, organization_id: UUID) -> dict:
        """
        Retourne un résumé statistique des véhicules

        Args:
            organization_id: UUID de l'organisation

        Returns:
            Dictionnaire avec les statistiques
        """
        # Total
        total_query = select(func.count()).where(
            Vehicle.organization_id == organization_id
        )
        total_result = await self.session.execute(total_query)
        total = total_result.scalar() or 0

        # Par statut
        status_query = select(
            Vehicle.status,
            func.count()
        ).where(
            Vehicle.organization_id == organization_id
        ).group_by(Vehicle.status)

        status_result = await self.session.execute(status_query)
        status_counts = {row[0]: row[1] for row in status_result}

        # Avec localisation
        location_query = select(func.count()).where(
            Vehicle.organization_id == organization_id,
            Vehicle.current_latitude.isnot(None),
            Vehicle.current_longitude.isnot(None)
        )
        location_result = await self.session.execute(location_query)
        with_location = location_result.scalar() or 0

        return {
            "total": total,
            "available": status_counts.get(VehicleStatus.AVAILABLE.value, 0),
            "in_service": status_counts.get(VehicleStatus.IN_SERVICE.value, 0),
            "maintenance": status_counts.get(VehicleStatus.MAINTENANCE.value, 0),
            "out_of_service": status_counts.get(VehicleStatus.OUT_OF_SERVICE.value, 0),
            "with_location": with_location
        }

    async def update_location(
        self,
        vehicle_id: UUID,
        latitude: float,
        longitude: float,
        organization_id: Optional[UUID] = None
    ) -> Optional[Vehicle]:
        """
        Met à jour la position GPS d'un véhicule

        Args:
            vehicle_id: UUID du véhicule
            latitude: Latitude
            longitude: Longitude
            organization_id: Filtre optionnel par organisation

        Returns:
            Véhicule mis à jour ou None
        """
        from datetime import datetime

        return await self.update(
            vehicle_id,
            {
                "current_latitude": latitude,
                "current_longitude": longitude,
                "last_position_update": datetime.utcnow().isoformat()
            },
            organization_id
        )

    async def update_status(
        self,
        vehicle_id: UUID,
        status: VehicleStatus,
        organization_id: Optional[UUID] = None
    ) -> Optional[Vehicle]:
        """
        Met à jour le statut d'un véhicule

        Args:
            vehicle_id: UUID du véhicule
            status: Nouveau statut
            organization_id: Filtre optionnel par organisation

        Returns:
            Véhicule mis à jour ou None
        """
        return await self.update(
            vehicle_id,
            {"status": status.value},
            organization_id
        )
