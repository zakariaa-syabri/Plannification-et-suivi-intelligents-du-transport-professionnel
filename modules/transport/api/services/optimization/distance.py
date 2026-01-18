"""
Fonctions de calcul de distance
"""

import math
from typing import List, Tuple

# Rayon de la Terre en kilomètres
EARTH_RADIUS_KM = 6371.0


def haversine_distance(
    coord1: Tuple[float, float],
    coord2: Tuple[float, float]
) -> float:
    """
    Calcule la distance entre deux points GPS en utilisant la formule de Haversine

    Args:
        coord1: Tuple (latitude, longitude) du premier point
        coord2: Tuple (latitude, longitude) du second point

    Returns:
        Distance en kilomètres
    """
    lat1, lon1 = coord1
    lat2, lon2 = coord2

    # Conversion en radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    # Formule de Haversine
    a = math.sin(dlat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_KM * c


def euclidean_distance(
    coord1: Tuple[float, float],
    coord2: Tuple[float, float]
) -> float:
    """
    Calcule la distance euclidienne (approximation pour petites distances)

    Args:
        coord1: Tuple (latitude, longitude) du premier point
        coord2: Tuple (latitude, longitude) du second point

    Returns:
        Distance en degrés (à convertir si nécessaire)
    """
    lat1, lon1 = coord1
    lat2, lon2 = coord2

    return math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2)


def calculate_travel_time(
    distance_km: float,
    speed_kmh: float = 30.0
) -> int:
    """
    Calcule le temps de trajet en secondes

    Args:
        distance_km: Distance en kilomètres
        speed_kmh: Vitesse moyenne en km/h

    Returns:
        Temps de trajet en secondes
    """
    hours = distance_km / speed_kmh
    return int(hours * 3600)


def create_distance_matrix(
    locations: List[Tuple[float, float]],
    in_meters: bool = True
) -> List[List[int]]:
    """
    Crée une matrice de distances entre tous les points

    Args:
        locations: Liste de coordonnées (latitude, longitude)
        in_meters: Si True, distances en mètres; sinon en kilomètres

    Returns:
        Matrice de distances (entiers pour OR-Tools)
    """
    n = len(locations)
    matrix = [[0] * n for _ in range(n)]

    multiplier = 1000 if in_meters else 1

    for i in range(n):
        for j in range(n):
            if i != j:
                dist = haversine_distance(locations[i], locations[j])
                matrix[i][j] = int(dist * multiplier)

    return matrix


def create_time_matrix(
    distance_matrix: List[List[int]],
    speed_kmh: float = 30.0,
    distances_in_meters: bool = True
) -> List[List[int]]:
    """
    Crée une matrice de temps de trajet basée sur une matrice de distances

    Args:
        distance_matrix: Matrice de distances
        speed_kmh: Vitesse moyenne en km/h
        distances_in_meters: Si True, les distances sont en mètres

    Returns:
        Matrice de temps (en secondes)
    """
    n = len(distance_matrix)
    time_matrix = [[0] * n for _ in range(n)]

    divisor = 1000 if distances_in_meters else 1

    for i in range(n):
        for j in range(n):
            if i != j:
                distance_km = distance_matrix[i][j] / divisor
                time_matrix[i][j] = calculate_travel_time(distance_km, speed_kmh)

    return time_matrix


def total_route_distance(
    route: List[int],
    distance_matrix: List[List[int]]
) -> int:
    """
    Calcule la distance totale d'une route

    Args:
        route: Liste des indices des points dans l'ordre
        distance_matrix: Matrice de distances

    Returns:
        Distance totale
    """
    total = 0
    for i in range(len(route) - 1):
        total += distance_matrix[route[i]][route[i + 1]]
    return total


def find_nearest_neighbor(
    current: int,
    unvisited: set,
    distance_matrix: List[List[int]]
) -> int:
    """
    Trouve le voisin le plus proche (pour algorithme glouton)

    Args:
        current: Index du point actuel
        unvisited: Ensemble des indices non visités
        distance_matrix: Matrice de distances

    Returns:
        Index du point le plus proche
    """
    min_dist = float('inf')
    nearest = -1

    for node in unvisited:
        dist = distance_matrix[current][node]
        if dist < min_dist:
            min_dist = dist
            nearest = node

    return nearest


def nearest_neighbor_route(
    locations: List[Tuple[float, float]],
    depot_index: int = 0
) -> List[int]:
    """
    Génère une route en utilisant l'algorithme du plus proche voisin

    Args:
        locations: Liste de coordonnées
        depot_index: Index du dépôt

    Returns:
        Route (liste d'indices)
    """
    n = len(locations)
    if n == 0:
        return []

    distance_matrix = create_distance_matrix(locations)

    route = [depot_index]
    unvisited = set(range(n)) - {depot_index}

    current = depot_index
    while unvisited:
        nearest = find_nearest_neighbor(current, unvisited, distance_matrix)
        route.append(nearest)
        unvisited.remove(nearest)
        current = nearest

    # Retour au dépôt
    route.append(depot_index)

    return route
