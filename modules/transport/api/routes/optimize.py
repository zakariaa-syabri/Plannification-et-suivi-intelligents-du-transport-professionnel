"""
Route d'optimisation générique
Endpoint pour optimiser n'importe quelle liste de locations
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Tuple
from ..services.optimization import RouteOptimizer
from datetime import datetime

router = APIRouter(prefix="/api/optimize", tags=["Optimization"])


class Location(BaseModel):
    id: str
    latitude: float
    longitude: float
    name: Optional[str] = None


class OptimizeRequest(BaseModel):
    locations: List[Location]
    start_location: Optional[Location] = None
    start_time: str = "08:00"
    average_speed_kmh: float = 30.0
    service_time_minutes: int = 2


class OptimizedStop(BaseModel):
    id: str
    latitude: float
    longitude: float
    name: Optional[str]
    sequence_order: int
    arrival_time: str
    cumulative_distance_km: float
    cumulative_time_minutes: float


class OptimizeResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    optimized_stops: Optional[List[OptimizedStop]] = None
    total_distance_km: Optional[float] = None
    total_time_minutes: Optional[float] = None
    algorithm: str = "Google OR-Tools VRP/VRPTW"


@router.post("/route", response_model=OptimizeResponse)
async def optimize_route(request: OptimizeRequest):
    """
    Optimise une liste de locations en utilisant VRP/VRPTW

    - Prend une liste de locations avec coordonnées GPS
    - Optionnellement un point de départ (véhicule)
    - Retourne l'ordre optimal de visite avec ETA
    """
    try:
        if len(request.locations) < 2:
            return OptimizeResponse(
                success=False,
                message="Au moins 2 locations sont nécessaires pour l'optimisation"
            )

        # Préparer les données pour l'optimiseur
        all_locations: List[Tuple[float, float]] = []
        location_ids: List[str] = []
        location_names: List[Optional[str]] = []

        # Ajouter le point de départ si spécifié
        has_start = request.start_location is not None
        if has_start:
            all_locations.append((
                request.start_location.latitude,
                request.start_location.longitude
            ))
            location_ids.append(request.start_location.id)
            location_names.append(request.start_location.name)

        # Ajouter toutes les locations
        for loc in request.locations:
            all_locations.append((loc.latitude, loc.longitude))
            location_ids.append(loc.id)
            location_names.append(loc.name)

        # Créer l'optimiseur
        optimizer = RouteOptimizer(
            average_speed_kmh=request.average_speed_kmh,
            service_time_minutes=request.service_time_minutes,
            depot_index=0  # Le premier point est le dépôt/départ
        )

        # Parser l'heure de départ
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_hour, start_minute = map(int, request.start_time.split(':'))
        start_datetime = today.replace(hour=start_hour, minute=start_minute)

        # Optimiser
        result = optimizer.optimize_route_vrp(
            locations=all_locations,
            start_time=start_datetime
        )

        if not result.get('success'):
            return OptimizeResponse(
                success=False,
                message=result.get('message', 'Échec de l\'optimisation')
            )

        # Construire la réponse
        optimized_stops: List[OptimizedStop] = []
        route = result.get('route', [])

        for i, stop in enumerate(route):
            idx = stop['index']
            # Skip le point de départ dans le résultat si c'était le véhicule
            if has_start and idx == 0:
                continue

            optimized_stops.append(OptimizedStop(
                id=location_ids[idx],
                latitude=stop['latitude'],
                longitude=stop['longitude'],
                name=location_names[idx],
                sequence_order=len(optimized_stops) + 1,
                arrival_time=stop['arrival_time'],
                cumulative_distance_km=stop['cumulative_distance_km'],
                cumulative_time_minutes=stop['cumulative_time_minutes']
            ))

        stats = result.get('statistics', {})

        return OptimizeResponse(
            success=True,
            optimized_stops=optimized_stops,
            total_distance_km=stats.get('total_distance_km', 0),
            total_time_minutes=stats.get('total_time_minutes', 0),
            algorithm="Google OR-Tools VRP/VRPTW"
        )

    except Exception as e:
        return OptimizeResponse(
            success=False,
            message=f"Erreur lors de l'optimisation: {str(e)}"
        )


@router.get("/health")
async def optimization_health():
    """Vérifier si le service d'optimisation est disponible"""
    try:
        # Test simple de l'optimiseur
        optimizer = RouteOptimizer()
        return {
            "status": "healthy",
            "service": "VRP/VRPTW Optimization",
            "library": "Google OR-Tools"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
