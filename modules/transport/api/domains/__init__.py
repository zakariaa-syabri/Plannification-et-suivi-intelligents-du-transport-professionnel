"""
Domains module - Business logic organized by domain
Each domain contains: models, schemas, repository, service, routes
"""

from .base import BaseModel, BaseRepository, BaseService
from .base.schemas import (
    PaginatedResponse,
    PaginationParams,
    BaseSchema,
    CreateSchema,
    UpdateSchema,
)

__all__ = [
    "BaseModel",
    "BaseRepository",
    "BaseService",
    "PaginatedResponse",
    "PaginationParams",
    "BaseSchema",
    "CreateSchema",
    "UpdateSchema",
]
