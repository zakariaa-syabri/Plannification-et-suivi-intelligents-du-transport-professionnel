"""
Gestion de la base de données avec SQLAlchemy async
- Connection pooling
- Context managers pour les sessions
- Support multi-tenant
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import text

from .config import settings

logger = logging.getLogger(__name__)

# Base pour les modèles SQLAlchemy
Base = declarative_base()


class Database:
    """
    Gestionnaire de base de données avec connection pooling
    Thread-safe et optimisé pour les applications async
    """

    def __init__(self, database_url: Optional[str] = None):
        self._url = database_url or settings.database_url
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker[AsyncSession]] = None

    @property
    def engine(self) -> AsyncEngine:
        """Retourne le moteur SQLAlchemy (lazy initialization)"""
        if self._engine is None:
            self._engine = create_async_engine(
                self._url,
                pool_size=settings.database_pool_size,
                max_overflow=settings.database_max_overflow,
                pool_timeout=settings.database_pool_timeout,
                pool_pre_ping=True,  # Vérifie la connexion avant utilisation
                echo=settings.database_echo,
            )
        return self._engine

    @property
    def session_factory(self) -> async_sessionmaker[AsyncSession]:
        """Retourne la factory de sessions"""
        if self._session_factory is None:
            self._session_factory = async_sessionmaker(
                bind=self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=False,
            )
        return self._session_factory

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Context manager pour une session de base de données
        Gère automatiquement commit/rollback

        Usage:
            async with db.session() as session:
                result = await session.execute(query)
        """
        session = self.session_factory()
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()

    @asynccontextmanager
    async def tenant_session(
        self, organization_id: str
    ) -> AsyncGenerator[AsyncSession, None]:
        """
        Session avec contexte multi-tenant
        Configure le tenant ID pour les politiques RLS de PostgreSQL

        Usage:
            async with db.tenant_session(org_id) as session:
                # Toutes les requêtes sont filtrées par org_id
                result = await session.execute(query)
        """
        async with self.session() as session:
            # Définir le tenant pour les politiques RLS
            await session.execute(
                text(f"SET app.organization_id = '{organization_id}'")
            )
            yield session

    async def health_check(self) -> bool:
        """Vérifie la connexion à la base de données"""
        try:
            async with self.session() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

    async def close(self) -> None:
        """Ferme toutes les connexions du pool"""
        if self._engine:
            await self._engine.dispose()
            self._engine = None
            self._session_factory = None
            logger.info("Database connections closed")

    async def create_tables(self) -> None:
        """Crée toutes les tables (utile pour les tests)"""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)


# Instance singleton de la base de données
_database: Optional[Database] = None


def get_database() -> Database:
    """Retourne l'instance singleton de Database"""
    global _database
    if _database is None:
        _database = Database()
    return _database


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection pour FastAPI

    Usage dans les routes:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    database = get_database()
    async with database.session() as session:
        yield session


async def get_tenant_db(organization_id: str) -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection avec contexte multi-tenant

    Usage:
        @router.get("/items")
        async def get_items(
            org_id: str = Depends(get_current_organization),
            db: AsyncSession = Depends(lambda: get_tenant_db(org_id))
        ):
            ...
    """
    database = get_database()
    async with database.tenant_session(organization_id) as session:
        yield session


# Alias pour compatibilité
db = get_database()
