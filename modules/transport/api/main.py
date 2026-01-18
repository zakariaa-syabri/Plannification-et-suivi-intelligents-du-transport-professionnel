"""
API FastAPI pour le module Transport
Planification et suivi intelligents du transport professionnel
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.config import settings
from api.routes import health, summary, bus, tournees, passagers, ecoles, optimize

# Création de l'application FastAPI
app = FastAPI(
    title="API Transport Intelligent",
    description="API pour la planification et le suivi en temps réel du transport professionnel",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enregistrement des routes
app.include_router(health.router, tags=["Health"])
app.include_router(summary.router, tags=["Summary"])
app.include_router(bus.router, tags=["Bus"])
app.include_router(tournees.router, tags=["Tournees"])
app.include_router(passagers.router, tags=["Passagers"])
app.include_router(ecoles.router, tags=["Ecoles"])
app.include_router(optimize.router, tags=["Optimization"])


@app.on_event("startup")
async def startup_event():
    """Événement au démarrage de l'application"""
    print("🚀 API Transport démarrée")
    print(f"📍 Documentation disponible sur http://{settings.api_host}:{settings.api_port}/docs")


@app.on_event("shutdown")
async def shutdown_event():
    """Événement à l'arrêt de l'application"""
    print("🛑 API Transport arrêtée")


@app.get("/")
async def root():
    """Point d'entrée racine de l'API"""
    return {
        "message": "API Transport Intelligent",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
