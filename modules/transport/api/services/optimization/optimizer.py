"""
Optimiseur de routes principal
Utilise le pattern Strategy pour choisir l'algorithme
"""

import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime

from api.core.config import settings
from api.core.exceptions import OptimizationError, ValidationError

from .strategies import OptimizationStrategy, VRPStrategy, VRPTWStrategy
from .distance import haversine_distance, create_distance_matrix

logger = logging.getLogger(__name__)


class RouteOptimizer:
    """
    Optimiseur de routes principal

    Utilise différentes stratégies d'optimisation selon les contraintes:
    - VRP: Minimisation de distance simple
    - VRPTW: Avec fenêtres temporelles
    - Capacitated VRP: Avec contraintes de capacité

    Usage:
        optimizer = RouteOptimizer()
        result = optimizer.optimize(locations, constraints)

        # Ou avec une stratégie spécifique
        optimizer = RouteOptimizer(strategy=VRPTWStrategy())
    """

    def __init__(
        self,
        strategy: Optional[OptimizationStrategy] = None,
        timeout_seconds: Optional[int] = None,
        speed_kmh: Optional[float] = None,
        service_time_minutes: Optional[int] = None
    ):
        self.timeout = timeout_seconds or settings.optimization_timeout_seconds
        self.speed_kmh = speed_kmh or settings.default_speed_kmh
        self.service_time = (service_time_minutes or settings.default_service_time_minutes) * 60

        self._strategy = strategy

    @property
    def strategy(self) -> OptimizationStrategy:
        """Retourne la stratégie (lazy initialization)"""
        if self._strategy is None:
            self._strategy = VRPStrategy(timeout_seconds=self.timeout)
        return self._strategy

    @strategy.setter
    def strategy(self, value: OptimizationStrategy):
        self._strategy = value

    def optimize(
        self,
        locations: List[Tuple[float, float]],
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Optimise une route

        Args:
            locations: Liste de coordonnées (latitude, longitude)
            constraints: Contraintes optionnelles
                - depot_index: Index du dépôt (défaut: 0)
                - time_windows: Fenêtres temporelles [(start, end), ...]
                - start_time: Heure de départ
                - demands: Demandes par point (pour CVRP)
                - max_distance: Distance max en km
                - max_duration: Durée max en minutes

        Returns:
            Dictionnaire avec:
                - success: Booléen
                - route: Liste ordonnée des points
                - statistics: Statistiques de la route
        """
        constraints = constraints or {}

        # Validation des entrées
        self._validate_locations(locations)
        self._validate_constraints(constraints)

        # Sélectionner automatiquement la stratégie si pas définie
        if self._strategy is None:
            self._strategy = self._select_strategy(constraints)

        logger.info(f"Optimizing route with {len(locations)} locations using {type(self._strategy).__name__}")

        try:
            result = self.strategy.solve(locations, constraints)

            if result.get("success"):
                logger.info(f"Optimization successful: {result['statistics']}")
            else:
                logger.warning(f"Optimization failed: {result.get('message')}")

            return result

        except Exception as e:
            logger.error(f"Optimization error: {e}")
            raise OptimizationError(
                str(e),
                reason="algorithm_error",
                details={"locations_count": len(locations)}
            )

    def optimize_with_eta(
        self,
        locations: List[Dict[str, Any]],
        start_time: datetime,
        depot_location: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """
        Optimise une route et calcule les ETA pour chaque arrêt

        Args:
            locations: Liste de dictionnaires avec au moins {latitude, longitude}
            start_time: Heure de départ
            depot_location: Coordonnées du dépôt (optionnel, utilise le premier point sinon)

        Returns:
            Route optimisée avec ETA pour chaque arrêt
        """
        # Extraire les coordonnées
        coords = [(loc["latitude"], loc["longitude"]) for loc in locations]

        # Ajouter le dépôt en premier si fourni
        if depot_location:
            coords = [depot_location] + coords
            depot_index = 0
        else:
            depot_index = 0

        # Utiliser VRPTW pour avoir les temps
        self._strategy = VRPTWStrategy(
            timeout_seconds=self.timeout,
            service_time_seconds=self.service_time,
            speed_kmh=self.speed_kmh
        )

        result = self.optimize(coords, {
            "depot_index": depot_index,
            "start_time": start_time
        })

        if result.get("success"):
            # Enrichir avec les données originales
            for i, stop in enumerate(result["route"]):
                original_idx = stop["index"]
                if depot_location and original_idx > 0:
                    original_idx -= 1
                if 0 <= original_idx < len(locations):
                    stop["original_data"] = locations[original_idx]

        return result

    def calculate_eta(
        self,
        route: List[Tuple[float, float]],
        start_time: datetime
    ) -> List[datetime]:
        """
        Calcule les ETA pour une route donnée (sans optimisation)

        Args:
            route: Liste de coordonnées dans l'ordre
            start_time: Heure de départ

        Returns:
            Liste des heures d'arrivée estimées
        """
        from datetime import timedelta

        etas = [start_time]
        cumulative_time = 0

        for i in range(len(route) - 1):
            distance = haversine_distance(route[i], route[i + 1])
            travel_time = (distance / self.speed_kmh) * 3600  # En secondes
            cumulative_time += travel_time + self.service_time

            eta = start_time + timedelta(seconds=cumulative_time)
            etas.append(eta)

        return etas

    def estimate_route_metrics(
        self,
        locations: List[Tuple[float, float]]
    ) -> Dict[str, float]:
        """
        Estime les métriques d'une route sans optimisation

        Args:
            locations: Liste de coordonnées dans l'ordre

        Returns:
            Dictionnaire avec distance, durée estimée, etc.
        """
        total_distance = 0.0

        for i in range(len(locations) - 1):
            total_distance += haversine_distance(locations[i], locations[i + 1])

        travel_time = total_distance / self.speed_kmh  # En heures
        service_time = len(locations) * (self.service_time / 3600)  # En heures
        total_time = travel_time + service_time

        return {
            "total_distance_km": round(total_distance, 2),
            "travel_time_hours": round(travel_time, 2),
            "service_time_hours": round(service_time, 2),
            "total_time_hours": round(total_time, 2),
            "average_speed_kmh": self.speed_kmh,
            "number_of_stops": len(locations)
        }

    def _validate_locations(self, locations: List[Tuple[float, float]]) -> None:
        """Valide les coordonnées"""
        if not locations:
            raise ValidationError("Aucune localisation fournie")

        if len(locations) < 2:
            raise ValidationError("Au moins 2 points sont nécessaires")

        for i, (lat, lon) in enumerate(locations):
            if not (-90 <= lat <= 90):
                raise ValidationError(f"Latitude invalide au point {i}: {lat}")
            if not (-180 <= lon <= 180):
                raise ValidationError(f"Longitude invalide au point {i}: {lon}")

    def _validate_constraints(self, constraints: Dict[str, Any]) -> None:
        """Valide les contraintes"""
        if "max_distance" in constraints:
            max_dist = constraints["max_distance"]
            if max_dist <= 0:
                raise ValidationError("max_distance doit être positif")

        if "max_duration" in constraints:
            max_dur = constraints["max_duration"]
            if max_dur <= 0:
                raise ValidationError("max_duration doit être positif")

        if "depot_index" in constraints:
            depot = constraints["depot_index"]
            if depot < 0:
                raise ValidationError("depot_index doit être positif ou nul")

    def _select_strategy(self, constraints: Dict[str, Any]) -> OptimizationStrategy:
        """Sélectionne automatiquement la meilleure stratégie"""
        has_time_windows = "time_windows" in constraints and constraints["time_windows"]
        has_start_time = "start_time" in constraints

        if has_time_windows or has_start_time:
            return VRPTWStrategy(
                timeout_seconds=self.timeout,
                service_time_seconds=self.service_time,
                speed_kmh=self.speed_kmh
            )

        return VRPStrategy(timeout_seconds=self.timeout)


# Fonction utilitaire pour usage rapide
def optimize_route(
    locations: List[Tuple[float, float]],
    start_time: Optional[datetime] = None,
    depot_index: int = 0
) -> Dict[str, Any]:
    """
    Fonction utilitaire pour optimiser une route rapidement

    Args:
        locations: Liste de coordonnées
        start_time: Heure de départ optionnelle
        depot_index: Index du dépôt

    Returns:
        Résultat de l'optimisation
    """
    optimizer = RouteOptimizer()

    constraints = {"depot_index": depot_index}
    if start_time:
        constraints["start_time"] = start_time

    return optimizer.optimize(locations, constraints)
