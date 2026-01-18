"""
Modèles de base SQLAlchemy pour toutes les entités
Inclut le support multi-tenant et les timestamps automatiques
"""

from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import Column, String, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declared_attr

from api.core.database import Base


class TimestampMixin:
    """Mixin pour ajouter les timestamps created_at et updated_at"""

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )


class SoftDeleteMixin:
    """Mixin pour le soft delete"""

    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    def soft_delete(self):
        """Marque l'entité comme supprimée"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()


class TenantMixin:
    """Mixin pour le support multi-tenant"""

    @declared_attr
    def organization_id(cls):
        return Column(
            UUID(as_uuid=True),
            nullable=False,
            index=True,
            comment="ID de l'organisation (multi-tenant)"
        )


class BaseModel(Base, TimestampMixin):
    """
    Modèle de base abstrait pour toutes les entités
    Inclut: UUID, timestamps, organisation

    Usage:
        class Vehicle(BaseModel):
            __tablename__ = "vehicles"
            name = Column(String(255), nullable=False)
    """

    __abstract__ = True

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Identifiant unique"
    )


class TenantBaseModel(BaseModel, TenantMixin):
    """
    Modèle de base avec support multi-tenant
    Toutes les entités métier doivent hériter de cette classe
    """

    __abstract__ = True


class AuditMixin:
    """Mixin pour l'audit trail"""

    @declared_attr
    def created_by(cls):
        return Column(
            UUID(as_uuid=True),
            nullable=True,
            comment="ID de l'utilisateur créateur"
        )

    @declared_attr
    def updated_by(cls):
        return Column(
            UUID(as_uuid=True),
            nullable=True,
            comment="ID du dernier utilisateur modificateur"
        )


class FullAuditModel(TenantBaseModel, SoftDeleteMixin, AuditMixin):
    """
    Modèle complet avec:
    - UUID
    - Timestamps (created_at, updated_at)
    - Multi-tenant (organization_id)
    - Soft delete (is_deleted, deleted_at)
    - Audit (created_by, updated_by)
    """

    __abstract__ = True
