"""
Service pour les sites
"""

import logging
from typing import List, Optional, Dict, Any
from uuid import UUID

from api.core.exceptions import ValidationError, ConflictError
from api.domains.base.service import BaseService
from .models import Site, SiteType
from .repository import SiteRepository
from .schemas import SiteSummary

logger = logging.getLogger(__name__)


class SiteService(BaseService[Site, SiteRepository]):
    """Service métier pour les sites"""

    def __init__(self, repository: SiteRepository):
        super().__init__(repository)

    async def _validate_create(self, data: Dict[str, Any]) -> None:
        """Validation avant création"""
        # Vérifier l'unicité du code
        if data.get("code"):
            existing = await self.repository.find_by_code(
                data["code"],
                data.get("organization_id")
            )
            if existing:
                raise ConflictError(
                    f"Un site avec le code '{data['code']}' existe déjà",
                    resource="site"
                )

        # Valider les coordonnées
        if not (-90 <= data.get("latitude", 0) <= 90):
            raise ValidationError("Latitude invalide", field="latitude")
        if not (-180 <= data.get("longitude", 0) <= 180):
            raise ValidationError("Longitude invalide", field="longitude")

    async def _validate_update(
        self,
        existing: Site,
        data: Dict[str, Any]
    ) -> None:
        """Validation avant mise à jour"""
        new_code = data.get("code")
        if new_code and new_code != existing.code:
            other = await self.repository.find_by_code(
                new_code,
                existing.organization_id
            )
            if other and other.id != existing.id:
                raise ConflictError(
                    f"Un site avec le code '{new_code}' existe déjà",
                    resource="site"
                )

    async def get_depots(self, organization_id: UUID) -> List[Site]:
        """Récupère tous les dépôts"""
        return await self.repository.find_depots(organization_id)

    async def get_by_type(
        self,
        organization_id: UUID,
        site_type: SiteType
    ) -> List[Site]:
        """Récupère les sites par type"""
        return await self.repository.find_by_type(organization_id, site_type)

    async def get_in_radius(
        self,
        organization_id: UUID,
        center_lat: float,
        center_lon: float,
        radius_km: float
    ) -> List[Site]:
        """Récupère les sites dans un rayon"""
        delta = radius_km / 111.0  # Approximation

        sites = await self.repository.find_in_area(
            organization_id,
            min_lat=center_lat - delta,
            max_lat=center_lat + delta,
            min_lon=center_lon - delta,
            max_lon=center_lon + delta
        )

        # Filtrer par distance exacte
        from api.services.optimization.distance import haversine_distance

        return [
            site for site in sites
            if haversine_distance((center_lat, center_lon), site.coordinates) <= radius_km
        ]

    async def get_summary(self, organization_id: UUID) -> SiteSummary:
        """Retourne un résumé statistique"""
        stats = await self.repository.get_summary(organization_id)
        return SiteSummary(**stats)

    async def geocode_address(
        self,
        address: str
    ) -> Optional[tuple]:
        """
        Géocode une adresse (retourne lat, lon)
        Utilise le service de géocodage
        """
        from api.services.geocoding import geocode

        result = await geocode(address)
        if result:
            return (result["latitude"], result["longitude"])
        return None
