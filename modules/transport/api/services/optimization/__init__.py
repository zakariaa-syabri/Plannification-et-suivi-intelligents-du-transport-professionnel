"""
Optimization service - Route optimization with VRP/VRPTW
"""

from typing import List, Dict, Tuple
from datetime import datetime

from .optimizer import RouteOptimizer
from .strategies import OptimizationStrategy, VRPStrategy, VRPTWStrategy
from .distance import haversine_distance, create_distance_matrix


def optimize_school_bus_route(
    stops: List[Dict],
    depot_location: Tuple[float, float],
    start_time: str = "07:00",
    school_arrival_time: str = "08:30",
    average_speed_kmh: float = 30.0
) -> Dict:
    """
    Fonction principale pour optimiser une tournée de bus scolaire

    Args:
        stops: Liste des arrêts avec coordonnées [{id, latitude, longitude, adresse}]
        depot_location: Coordonnées du dépôt/garage (lat, lon)
        start_time: Heure de départ du dépôt (format HH:MM)
        school_arrival_time: Heure d'arrivée souhaitée à l'école (format HH:MM)
        average_speed_kmh: Vitesse moyenne du bus

    Returns:
        Itinéraire optimisé avec ETA pour chaque arrêt
    """
    # Préparer les données
    locations = [depot_location]  # Le dépôt est toujours le premier point
    stop_ids = [None]  # ID du dépôt

    for stop in stops:
        locations.append((stop['latitude'], stop['longitude']))
        stop_ids.append(stop.get('id'))

    # Convertir les heures en datetime
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    start_hour, start_minute = map(int, start_time.split(':'))
    start_datetime = today.replace(hour=start_hour, minute=start_minute)

    # Créer l'optimiseur avec VRPTW pour avoir les temps
    optimizer = RouteOptimizer(
        speed_kmh=average_speed_kmh,
        strategy=VRPTWStrategy(speed_kmh=average_speed_kmh)
    )

    # Optimiser
    result = optimizer.optimize(
        locations,
        {"depot_index": 0, "start_time": start_datetime}
    )

    if result.get('success'):
        # Enrichir les résultats avec les IDs des arrêts
        for stop_data in result.get('route', []):
            stop_idx = stop_data.get('index', 0)
            if stop_idx < len(stop_ids):
                stop_data['stop_id'] = stop_ids[stop_idx]
                if stop_idx > 0 and stop_idx - 1 < len(stops):
                    stop_data['adresse'] = stops[stop_idx - 1].get('adresse', '')

    return result


__all__ = [
    "RouteOptimizer",
    "OptimizationStrategy",
    "VRPStrategy",
    "VRPTWStrategy",
    "haversine_distance",
    "create_distance_matrix",
    "optimize_school_bus_route",
]
