"""
Module d'optimisation de tournées avec VRP/VRPTW et calcul d'ETA
Utilise Google OR-Tools pour résoudre le problème d'optimisation
"""
from typing import List, Dict, Tuple, Optional
import math
from datetime import datetime, timedelta
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp


class RouteOptimizer:
    """Optimiseur de tournées avec algorithmes VRP/VRPTW"""

    def __init__(
        self,
        average_speed_kmh: float = 30.0,  # Vitesse moyenne en km/h
        service_time_minutes: int = 2,    # Temps d'arrêt par étudiant (minutes)
        depot_index: int = 0               # Index du dépôt (point de départ/arrivée)
    ):
        self.average_speed_kmh = average_speed_kmh
        self.service_time_seconds = service_time_minutes * 60
        self.depot_index = depot_index

    def calculate_distance(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """
        Calcule la distance euclidienne entre deux coordonnées (lat, lon) en kilomètres
        Utilise la formule de Haversine pour plus de précision
        """
        lat1, lon1 = coord1
        lat2, lon2 = coord2

        # Rayon de la Terre en km
        R = 6371.0

        # Conversion en radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlon = math.radians(lon2 - lon1)
        dlat = math.radians(lat2 - lat1)

        # Formule de Haversine
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c

        return distance

    def calculate_travel_time(self, distance_km: float) -> int:
        """
        Calcule le temps de trajet en secondes pour une distance donnée
        """
        hours = distance_km / self.average_speed_kmh
        return int(hours * 3600)

    def calculate_eta(
        self,
        start_time: datetime,
        cumulative_travel_time: int,
        cumulative_service_time: int
    ) -> datetime:
        """
        Calcule l'heure d'arrivée estimée (ETA)

        Args:
            start_time: Heure de départ
            cumulative_travel_time: Temps de trajet cumulé en secondes
            cumulative_service_time: Temps de service cumulé en secondes

        Returns:
            Heure d'arrivée estimée
        """
        total_time = cumulative_travel_time + cumulative_service_time
        return start_time + timedelta(seconds=total_time)

    def create_distance_matrix(self, locations: List[Tuple[float, float]]) -> List[List[int]]:
        """
        Crée une matrice de distances entre tous les points
        Les distances sont en mètres (entiers pour OR-Tools)
        """
        num_locations = len(locations)
        distance_matrix = [[0] * num_locations for _ in range(num_locations)]

        for i in range(num_locations):
            for j in range(num_locations):
                if i != j:
                    distance_km = self.calculate_distance(locations[i], locations[j])
                    distance_matrix[i][j] = int(distance_km * 1000)  # Convertir en mètres

        return distance_matrix

    def create_time_matrix(self, distance_matrix: List[List[int]]) -> List[List[int]]:
        """
        Crée une matrice de temps de trajet basée sur la matrice de distances
        Temps en secondes
        """
        num_locations = len(distance_matrix)
        time_matrix = [[0] * num_locations for _ in range(num_locations)]

        for i in range(num_locations):
            for j in range(num_locations):
                if i != j:
                    distance_km = distance_matrix[i][j] / 1000.0
                    time_matrix[i][j] = self.calculate_travel_time(distance_km)

        return time_matrix

    def optimize_route_vrp(
        self,
        locations: List[Tuple[float, float]],
        time_windows: Optional[List[Tuple[int, int]]] = None,
        start_time: Optional[datetime] = None
    ) -> Dict:
        """
        Optimise une tournée en utilisant VRP/VRPTW avec OR-Tools

        Args:
            locations: Liste de coordonnées (latitude, longitude)
            time_windows: Fenêtres temporelles optionnelles [(début, fin)] en secondes depuis start_time
            start_time: Heure de départ (utilisée pour calculer les ETA)

        Returns:
            Dictionnaire contenant l'itinéraire optimisé et les statistiques
        """
        if len(locations) < 2:
            return {
                "success": False,
                "message": "Au moins 2 points sont nécessaires pour l'optimisation"
            }

        # Créer les matrices de distance et de temps
        distance_matrix = self.create_distance_matrix(locations)
        time_matrix = self.create_time_matrix(distance_matrix)

        # Créer le gestionnaire de données
        data = {
            'distance_matrix': distance_matrix,
            'time_matrix': time_matrix,
            'num_vehicles': 1,
            'depot': self.depot_index,
            'time_windows': time_windows
        }

        # Créer le gestionnaire d'index
        manager = pywrapcp.RoutingIndexManager(
            len(data['distance_matrix']),
            data['num_vehicles'],
            data['depot']
        )

        # Créer le modèle de routage
        routing = pywrapcp.RoutingModel(manager)

        # Définir la fonction de coût (distance)
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return data['distance_matrix'][from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Ajouter la dimension de temps si des fenêtres temporelles sont fournies
        if time_windows:
            def time_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                return data['time_matrix'][from_node][to_node] + self.service_time_seconds

            time_callback_index = routing.RegisterTransitCallback(time_callback)

            # Horizon temporel (24 heures en secondes)
            horizon = 86400

            routing.AddDimension(
                time_callback_index,
                horizon,  # Temps d'attente maximum
                horizon,  # Capacité maximale du véhicule en temps
                False,    # Ne pas forcer à zéro au départ
                'Time'
            )

            time_dimension = routing.GetDimensionOrDie('Time')

            # Ajouter les contraintes de fenêtres temporelles
            for location_idx, time_window in enumerate(time_windows):
                if location_idx == data['depot']:
                    continue
                index = manager.NodeToIndex(location_idx)
                time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

            # Ajouter la fenêtre temporelle pour le dépôt
            depot_idx = data['depot']
            index = manager.NodeToIndex(depot_idx)
            time_dimension.CumulVar(index).SetRange(time_windows[depot_idx][0], time_windows[depot_idx][1])

        # Définir les paramètres de recherche
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = 5  # Limite de 5 secondes

        # Résoudre le problème
        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            return {
                "success": False,
                "message": "Aucune solution trouvée. Essayez de relâcher les contraintes."
            }

        # Extraire la solution
        return self._extract_solution(
            manager,
            routing,
            solution,
            locations,
            distance_matrix,
            time_matrix,
            start_time
        )

    def _extract_solution(
        self,
        manager,
        routing,
        solution,
        locations: List[Tuple[float, float]],
        distance_matrix: List[List[int]],
        time_matrix: List[List[int]],
        start_time: Optional[datetime]
    ) -> Dict:
        """
        Extrait la solution optimisée et calcule les statistiques
        """
        route = []
        total_distance = 0
        total_time = 0

        index = routing.Start(0)
        route_distance = 0
        route_time = 0

        if start_time is None:
            start_time = datetime.now()

        cumulative_travel_time = 0
        cumulative_service_time = 0

        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)

            # Calculer l'ETA pour cet arrêt
            eta = self.calculate_eta(start_time, cumulative_travel_time, cumulative_service_time)

            route.append({
                'index': node_index,
                'location': locations[node_index],
                'latitude': locations[node_index][0],
                'longitude': locations[node_index][1],
                'arrival_time': eta.strftime('%H:%M:%S'),
                'cumulative_distance_km': round(route_distance / 1000, 2),
                'cumulative_time_minutes': round((cumulative_travel_time + cumulative_service_time) / 60, 1)
            })

            previous_index = index
            index = solution.Value(routing.NextVar(index))

            if not routing.IsEnd(index):
                next_node = manager.IndexToNode(index)
                distance = distance_matrix[node_index][next_node]
                travel_time = time_matrix[node_index][next_node]

                route_distance += distance
                route_time += travel_time
                cumulative_travel_time += travel_time
                cumulative_service_time += self.service_time_seconds

        # Ajouter le dernier point (retour au dépôt)
        final_node = manager.IndexToNode(index)
        final_eta = self.calculate_eta(start_time, cumulative_travel_time, cumulative_service_time)

        route.append({
            'index': final_node,
            'location': locations[final_node],
            'latitude': locations[final_node][0],
            'longitude': locations[final_node][1],
            'arrival_time': final_eta.strftime('%H:%M:%S'),
            'cumulative_distance_km': round(route_distance / 1000, 2),
            'cumulative_time_minutes': round((cumulative_travel_time + cumulative_service_time) / 60, 1)
        })

        total_distance = solution.ObjectiveValue()

        return {
            "success": True,
            "route": route,
            "statistics": {
                "total_distance_km": round(total_distance / 1000, 2),
                "total_time_minutes": round((cumulative_travel_time + cumulative_service_time) / 60, 1),
                "travel_time_minutes": round(cumulative_travel_time / 60, 1),
                "service_time_minutes": round(cumulative_service_time / 60, 1),
                "number_of_stops": len(route) - 1,  # Exclure le dépôt de retour
                "start_time": start_time.strftime('%H:%M:%S'),
                "end_time": final_eta.strftime('%H:%M:%S'),
                "average_speed_kmh": self.average_speed_kmh
            }
        }


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

    # Créer l'optimiseur
    optimizer = RouteOptimizer(average_speed_kmh=average_speed_kmh)

    # Optimiser sans contraintes de fenêtres temporelles pour commencer
    result = optimizer.optimize_route_vrp(locations, start_time=start_datetime)

    if result['success']:
        # Enrichir les résultats avec les IDs des arrêts
        for i, stop_data in enumerate(result['route']):
            stop_idx = stop_data['index']
            if stop_idx < len(stop_ids):
                stop_data['stop_id'] = stop_ids[stop_idx]
                if stop_idx > 0 and stop_idx - 1 < len(stops):
                    stop_data['adresse'] = stops[stop_idx - 1].get('adresse', '')

    return result
