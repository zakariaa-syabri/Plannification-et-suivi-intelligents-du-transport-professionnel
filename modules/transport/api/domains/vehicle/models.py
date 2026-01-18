"""
Modèles SQLAlchemy pour les véhicules
"""

from enum import Enum
from typing import Optional, List

from sqlalchemy import Column, String, Integer, Float, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from api.domains.base.models import TenantBaseModel


class VehicleStatus(str, Enum):
    """Statuts possibles d'un véhicule"""
    AVAILABLE = "available"
    IN_SERVICE = "in_service"
    MAINTENANCE = "maintenance"
    OUT_OF_SERVICE = "out_of_service"


class VehicleType(str, Enum):
    """Types de véhicules (génériques, personnalisables par domaine)"""
    BUS = "bus"
    VAN = "van"
    TRUCK = "truck"
    CAR = "car"
    AMBULANCE = "ambulance"
    OTHER = "other"


class Vehicle(TenantBaseModel):
    """
    Modèle Véhicule - Générique pour tous les domaines de transport

    Attributs:
        name: Nom/identifiant du véhicule
        vehicle_type: Type de véhicule (bus, van, etc.)
        registration: Immatriculation
        capacity: Capacité (personnes ou poids selon le domaine)
        status: État actuel du véhicule
        current_latitude/longitude: Position GPS actuelle
        metadata: Données additionnelles spécifiques au domaine (JSONB)
    """

    __tablename__ = "vehicles"

    # Identification
    name = Column(String(255), nullable=False, index=True)
    vehicle_type = Column(String(50), default=VehicleType.OTHER.value)
    registration = Column(String(50), nullable=True, unique=True)

    # Capacité
    capacity = Column(Integer, nullable=True)
    capacity_unit = Column(String(20), default="passengers")  # passengers, kg, m3

    # État
    status = Column(
        String(20),
        default=VehicleStatus.AVAILABLE.value,
        index=True
    )
    is_active = Column(Boolean, default=True)

    # Localisation GPS actuelle
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    last_position_update = Column(String(50), nullable=True)

    # Caractéristiques
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    color = Column(String(50), nullable=True)

    # Équipements et métadonnées (flexible, spécifique au domaine)
    equipment = Column(JSONB, default=list)
    metadata = Column(JSONB, default=dict)

    # Relations
    # routes = relationship("Route", back_populates="vehicle")

    def __repr__(self):
        return f"<Vehicle {self.name} ({self.registration})>"

    @property
    def has_location(self) -> bool:
        """Vérifie si le véhicule a une position GPS"""
        return self.current_latitude is not None and self.current_longitude is not None

    @property
    def location(self) -> Optional[tuple]:
        """Retourne la position GPS comme tuple (lat, lon)"""
        if self.has_location:
            return (self.current_latitude, self.current_longitude)
        return None

    def update_location(self, latitude: float, longitude: float) -> None:
        """Met à jour la position GPS"""
        from datetime import datetime
        self.current_latitude = latitude
        self.current_longitude = longitude
        self.last_position_update = datetime.utcnow().isoformat()
