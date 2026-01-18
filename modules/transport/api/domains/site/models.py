"""
Modèles SQLAlchemy pour les sites/locations
"""

from enum import Enum
from typing import Optional

from sqlalchemy import Column, String, Float, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from api.domains.base.models import TenantBaseModel


class SiteType(str, Enum):
    """Types de sites (génériques, personnalisables par domaine)"""
    DEPOT = "depot"
    PICKUP = "pickup"
    DELIVERY = "delivery"
    WAREHOUSE = "warehouse"
    SCHOOL = "school"
    HOSPITAL = "hospital"
    STOP = "stop"
    OTHER = "other"


class Site(TenantBaseModel):
    """
    Modèle Site - Point géographique générique

    Utilisé pour:
    - Dépôts/entrepôts
    - Points de ramassage/livraison
    - Écoles, hôpitaux, arrêts
    - Tout point d'intérêt sur une carte
    """

    __tablename__ = "sites"

    # Identification
    name = Column(String(255), nullable=False, index=True)
    site_type = Column(String(50), default=SiteType.OTHER.value, index=True)
    code = Column(String(50), nullable=True, unique=True)

    # Adresse
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), default="France")

    # Coordonnées GPS (obligatoires pour le calcul de routes)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # État
    is_active = Column(Boolean, default=True)
    is_depot = Column(Boolean, default=False)  # Point de départ/arrivée

    # Contraintes temporelles
    opening_time = Column(String(10), nullable=True)  # Format HH:MM
    closing_time = Column(String(10), nullable=True)
    service_time_minutes = Column(Float, default=5.0)  # Temps d'arrêt par défaut

    # Contact
    contact_name = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)

    # Métadonnées flexibles (spécifiques au domaine)
    metadata = Column(JSONB, default=dict)

    def __repr__(self):
        return f"<Site {self.name} ({self.site_type})>"

    @property
    def coordinates(self) -> tuple:
        """Retourne les coordonnées comme tuple (lat, lon)"""
        return (self.latitude, self.longitude)

    @property
    def full_address(self) -> str:
        """Retourne l'adresse complète"""
        parts = [self.address, self.postal_code, self.city, self.country]
        return ", ".join(p for p in parts if p)

    def has_time_window(self) -> bool:
        """Vérifie si le site a des contraintes horaires"""
        return self.opening_time is not None and self.closing_time is not None
