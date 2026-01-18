"""
Stratégies d'optimisation de routes
Pattern Strategy pour différents algorithmes
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta

from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

from .distance import create_distance_matrix, create_time_matrix


class OptimizationStrategy(ABC):
    """Interface pour les stratégies d'optimisation"""

    @abstractmethod
    def solve(
        self,
        locations: List[Tuple[float, float]],
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Résout le problème d'optimisation

        Args:
            locations: Liste de coordonnées (lat, lon)
            constraints: Contraintes et paramètres

        Returns:
            Solution avec route optimisée et statistiques
        """
        pass


class VRPStrategy(OptimizationStrategy):
    """
    Vehicle Routing Problem (VRP) - Minimise la distance totale
    Sans contraintes temporelles
    """

    def __init__(
        self,
        timeout_seconds: int = 30,
        num_vehicles: int = 1
    ):
        self.timeout_seconds = timeout_seconds
        self.num_vehicles = num_vehicles

    def solve(
        self,
        locations: List[Tuple[float, float]],
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        if len(locations) < 2:
            return {
                "success": False,
                "message": "Au moins 2 points sont nécessaires"
            }

        depot = constraints.get("depot_index", 0)
        distance_matrix = create_distance_matrix(locations)

        # Créer le gestionnaire d'index
        manager = pywrapcp.RoutingIndexManager(
            len(locations),
            self.num_vehicles,
            depot
        )

        # Créer le modèle de routage
        routing = pywrapcp.RoutingModel(manager)

        # Callback de distance
        def distance_callback(from_idx, to_idx):
            from_node = manager.IndexToNode(from_idx)
            to_node = manager.IndexToNode(to_idx)
            return distance_matrix[from_node][to_node]

        transit_cb_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_cb_index)

        # Paramètres de recherche
        search_params = pywrapcp.DefaultRoutingSearchParameters()
        search_params.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_params.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_params.time_limit.seconds = self.timeout_seconds

        # Résoudre
        solution = routing.SolveWithParameters(search_params)

        if not solution:
            return {
                "success": False,
                "message": "Aucune solution trouvée"
            }

        return self._extract_solution(
            manager, routing, solution, locations, distance_matrix, constraints
        )

    def _extract_solution(
        self,
        manager,
        routing,
        solution,
        locations,
        distance_matrix,
        constraints
    ) -> Dict[str, Any]:
        route = []
        index = routing.Start(0)
        total_distance = 0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            route.append({
                "index": node,
                "latitude": locations[node][0],
                "longitude": locations[node][1]
            })

            prev_index = index
            index = solution.Value(routing.NextVar(index))

            if not routing.IsEnd(index):
                next_node = manager.IndexToNode(index)
                total_distance += distance_matrix[node][next_node]

        # Ajouter le retour au dépôt
        final_node = manager.IndexToNode(index)
        route.append({
            "index": final_node,
            "latitude": locations[final_node][0],
            "longitude": locations[final_node][1]
        })

        return {
            "success": True,
            "route": route,
            "statistics": {
                "total_distance_km": round(total_distance / 1000, 2),
                "number_of_stops": len(route) - 1
            }
        }


class VRPTWStrategy(OptimizationStrategy):
    """
    Vehicle Routing Problem with Time Windows (VRPTW)
    Optimise avec contraintes temporelles
    """

    def __init__(
        self,
        timeout_seconds: int = 30,
        num_vehicles: int = 1,
        service_time_seconds: int = 120,
        speed_kmh: float = 30.0
    ):
        self.timeout_seconds = timeout_seconds
        self.num_vehicles = num_vehicles
        self.service_time_seconds = service_time_seconds
        self.speed_kmh = speed_kmh

    def solve(
        self,
        locations: List[Tuple[float, float]],
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        if len(locations) < 2:
            return {
                "success": False,
                "message": "Au moins 2 points sont nécessaires"
            }

        depot = constraints.get("depot_index", 0)
        time_windows = constraints.get("time_windows")
        start_time = constraints.get("start_time", datetime.now())

        distance_matrix = create_distance_matrix(locations)
        time_matrix = create_time_matrix(distance_matrix, self.speed_kmh)

        # Créer le gestionnaire
        manager = pywrapcp.RoutingIndexManager(
            len(locations),
            self.num_vehicles,
            depot
        )

        routing = pywrapcp.RoutingModel(manager)

        # Callback de distance
        def distance_callback(from_idx, to_idx):
            from_node = manager.IndexToNode(from_idx)
            to_node = manager.IndexToNode(to_idx)
            return distance_matrix[from_node][to_node]

        transit_cb_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_cb_index)

        # Callback de temps (incluant temps de service)
        def time_callback(from_idx, to_idx):
            from_node = manager.IndexToNode(from_idx)
            to_node = manager.IndexToNode(to_idx)
            return time_matrix[from_node][to_node] + self.service_time_seconds

        time_cb_index = routing.RegisterTransitCallback(time_callback)

        # Dimension temporelle
        horizon = 86400  # 24h en secondes
        routing.AddDimension(
            time_cb_index,
            horizon,  # Slack max
            horizon,  # Capacité max
            False,
            'Time'
        )
        time_dimension = routing.GetDimensionOrDie('Time')

        # Appliquer les fenêtres temporelles
        if time_windows:
            for i, tw in enumerate(time_windows):
                if i == depot:
                    continue
                index = manager.NodeToIndex(i)
                time_dimension.CumulVar(index).SetRange(tw[0], tw[1])

        # Paramètres de recherche
        search_params = pywrapcp.DefaultRoutingSearchParameters()
        search_params.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_params.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_params.time_limit.seconds = self.timeout_seconds

        solution = routing.SolveWithParameters(search_params)

        if not solution:
            return {
                "success": False,
                "message": "Aucune solution trouvée avec les contraintes temporelles"
            }

        return self._extract_solution_with_time(
            manager, routing, solution, locations,
            distance_matrix, time_matrix, start_time
        )

    def _extract_solution_with_time(
        self,
        manager,
        routing,
        solution,
        locations,
        distance_matrix,
        time_matrix,
        start_time: datetime
    ) -> Dict[str, Any]:
        route = []
        index = routing.Start(0)
        cumulative_time = 0
        cumulative_distance = 0

        time_dimension = routing.GetDimensionOrDie('Time')

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            time_var = time_dimension.CumulVar(index)
            arrival_time = start_time + timedelta(seconds=cumulative_time)

            route.append({
                "index": node,
                "latitude": locations[node][0],
                "longitude": locations[node][1],
                "arrival_time": arrival_time.strftime('%H:%M:%S'),
                "cumulative_distance_km": round(cumulative_distance / 1000, 2),
                "cumulative_time_minutes": round(cumulative_time / 60, 1)
            })

            prev_index = index
            index = solution.Value(routing.NextVar(index))

            if not routing.IsEnd(index):
                next_node = manager.IndexToNode(index)
                cumulative_distance += distance_matrix[node][next_node]
                cumulative_time += time_matrix[node][next_node] + self.service_time_seconds

        # Point final
        final_node = manager.IndexToNode(index)
        final_arrival = start_time + timedelta(seconds=cumulative_time)
        route.append({
            "index": final_node,
            "latitude": locations[final_node][0],
            "longitude": locations[final_node][1],
            "arrival_time": final_arrival.strftime('%H:%M:%S'),
            "cumulative_distance_km": round(cumulative_distance / 1000, 2),
            "cumulative_time_minutes": round(cumulative_time / 60, 1)
        })

        return {
            "success": True,
            "route": route,
            "statistics": {
                "total_distance_km": round(cumulative_distance / 1000, 2),
                "total_time_minutes": round(cumulative_time / 60, 1),
                "number_of_stops": len(route) - 1,
                "start_time": start_time.strftime('%H:%M:%S'),
                "end_time": final_arrival.strftime('%H:%M:%S')
            }
        }


class CapacitatedVRPStrategy(VRPStrategy):
    """
    Capacitated VRP - Avec contraintes de capacité véhicule
    """

    def __init__(
        self,
        timeout_seconds: int = 30,
        num_vehicles: int = 1,
        vehicle_capacity: int = 50
    ):
        super().__init__(timeout_seconds, num_vehicles)
        self.vehicle_capacity = vehicle_capacity

    def solve(
        self,
        locations: List[Tuple[float, float]],
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        demands = constraints.get("demands", [1] * len(locations))
        demands[constraints.get("depot_index", 0)] = 0  # Pas de demande au dépôt

        # Hériter de la solution de base et ajouter la contrainte de capacité
        # ... (implémentation complète à ajouter si nécessaire)

        return super().solve(locations, constraints)
