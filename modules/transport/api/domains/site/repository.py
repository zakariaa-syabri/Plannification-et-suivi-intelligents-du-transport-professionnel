"""
Repository pour les sites
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.domains.base.repository import BaseRepository
from .models import Site, SiteType


class SiteRepository(BaseRepository[Site]):
    """Repository spécialisé pour les sites"""

    def __init__(self, session: AsyncSession):
        super().__init__(Site, session)

    async def find_depots(self, organization_id: UUID) -> List[Site]:
        """Trouve tous les dépôts de l'organisation"""
        query = select(Site).where(
            Site.organization_id == organization_id,
            Site.is_depot == True,
            Site.is_active == True
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def find_by_type(
        self,
        organization_id: UUID,
        site_type: SiteType
    ) -> List[Site]:
        """Trouve les sites par type"""
        query = select(Site).where(
            Site.organization_id == organization_id,
            Site.site_type == site_type.value,
            Site.is_active == True
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def find_by_code(
        self,
        code: str,
        organization_id: Optional[UUID] = None
    ) -> Optional[Site]:
        """Trouve un site par son code"""
        query = select(Site).where(Site.code == code)
        if organization_id:
            query = query.where(Site.organization_id == organization_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def find_in_area(
        self,
        organization_id: UUID,
        min_lat: float,
        max_lat: float,
        min_lon: float,
        max_lon: float
    ) -> List[Site]:
        """Trouve les sites dans une zone géographique"""
        query = select(Site).where(
            Site.organization_id == organization_id,
            Site.latitude.between(min_lat, max_lat),
            Site.longitude.between(min_lon, max_lon),
            Site.is_active == True
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_summary(self, organization_id: UUID) -> dict:
        """Retourne un résumé statistique des sites"""
        # Total et actifs
        total_query = select(func.count()).where(
            Site.organization_id == organization_id
        )
        active_query = select(func.count()).where(
            Site.organization_id == organization_id,
            Site.is_active == True
        )
        depots_query = select(func.count()).where(
            Site.organization_id == organization_id,
            Site.is_depot == True
        )

        total = (await self.session.execute(total_query)).scalar() or 0
        active = (await self.session.execute(active_query)).scalar() or 0
        depots = (await self.session.execute(depots_query)).scalar() or 0

        # Par type
        type_query = select(
            Site.site_type,
            func.count()
        ).where(
            Site.organization_id == organization_id
        ).group_by(Site.site_type)

        type_result = await self.session.execute(type_query)
        by_type = {row[0]: row[1] for row in type_result}

        return {
            "total": total,
            "active": active,
            "depots": depots,
            "by_type": by_type
        }
