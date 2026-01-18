"""
API FastAPI pour le module Transport - Version 2.0
Architecture modulaire avec support multi-tenant
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from api.core.config import settings
from api.core.database import get_database
from api.core.exceptions import TransportException
from api.core.security import TenantMiddleware

# Import des routes
from api.domains.vehicle.routes import router as vehicle_router
# from api.domains.site.routes import router as site_router
# from api.domains.route.routes import router as route_router

# Configuration du logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format=settings.log_format
)
logger = logging.getLogger(__name__)


# ===================
# Lifespan (startup/shutdown)
# ===================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Gestion du cycle de vie de l'application
    Remplace les événements startup/shutdown dépréciés
    """
    # Startup
    logger.info("Starting Transport API...")

    # Vérifier la connexion DB
    db = get_database()
    if await db.health_check():
        logger.info("Database connection established")
    else:
        logger.error("Database connection failed!")

    # TODO: Initialiser MQTT si activé
    if settings.mqtt_enabled:
        logger.info(f"MQTT broker: {settings.mqtt_broker}:{settings.mqtt_port}")

    logger.info(f"API ready at http://{settings.api_host}:{settings.api_port}")
    logger.info(f"Documentation: http://{settings.api_host}:{settings.api_port}/docs")

    yield  # L'application tourne ici

    # Shutdown
    logger.info("Shutting down Transport API...")
    await db.close()
    logger.info("Cleanup complete")


# ===================
# Application FastAPI
# ===================

app = FastAPI(
    title="API Transport Intelligent",
    description="""
    API pour la planification et le suivi en temps réel du transport professionnel.

    ## Fonctionnalités

    * **Gestion des véhicules** - CRUD complet avec suivi GPS
    * **Gestion des sites** - Points de collecte/livraison
    * **Optimisation de routes** - Algorithmes VRP/VRPTW
    * **Suivi temps réel** - Positions GPS via MQTT

    ## Authentification

    Utilisez le header `Authorization: Bearer <token>` avec un token JWT valide.
    Le header `X-Organization-ID` est requis pour toutes les opérations.
    """,
    version="2.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan
)


# ===================
# Middleware
# ===================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Tenant middleware (extrait X-Organization-ID)
# app.add_middleware(TenantMiddleware)


# ===================
# Exception Handlers
# ===================

@app.exception_handler(TransportException)
async def transport_exception_handler(request: Request, exc: TransportException):
    """Handler pour les exceptions métier"""
    logger.warning(f"Transport exception: {exc.code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict()
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handler pour les erreurs de validation Pydantic"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Erreur de validation des données",
                "details": {"errors": errors}
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handler pour les exceptions non gérées"""
    logger.exception(f"Unhandled exception: {exc}")

    # En debug, retourner plus de détails
    if settings.debug:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": str(exc),
                    "type": type(exc).__name__
                }
            }
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Une erreur interne est survenue"
            }
        }
    )


# ===================
# Routes
# ===================

# API prefix
API_V1 = settings.api_prefix

# Health check (sans préfixe)
@app.get("/health", tags=["Health"])
async def health_check():
    """Vérification de l'état de l'API"""
    db = get_database()
    db_healthy = await db.health_check()

    return {
        "status": "healthy" if db_healthy else "degraded",
        "version": "2.0.0",
        "database": db_healthy,
        "mqtt": settings.mqtt_enabled
    }


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """Probe de readiness pour Kubernetes"""
    db = get_database()
    if not await db.health_check():
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "reason": "database"}
        )
    return {"status": "ready"}


@app.get("/health/live", tags=["Health"])
async def liveness_check():
    """Probe de liveness pour Kubernetes"""
    return {"status": "alive"}


# Root
@app.get("/", tags=["Root"])
async def root():
    """Point d'entrée de l'API"""
    return {
        "name": "API Transport Intelligent",
        "version": "2.0.0",
        "docs": "/docs" if settings.debug else "Documentation désactivée en production",
        "health": "/health"
    }


# Enregistrement des routers
app.include_router(vehicle_router, prefix=API_V1, tags=["Vehicles"])
# app.include_router(site_router, prefix=API_V1, tags=["Sites"])
# app.include_router(route_router, prefix=API_V1, tags=["Routes"])


# ===================
# Entry point
# ===================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api.main_v2:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
