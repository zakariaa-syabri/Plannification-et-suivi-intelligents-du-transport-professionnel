"""
Base domain - Generic components for all domains
"""

from .models import BaseModel
from .repository import BaseRepository
from .service import BaseService

__all__ = ["BaseModel", "BaseRepository", "BaseService"]
