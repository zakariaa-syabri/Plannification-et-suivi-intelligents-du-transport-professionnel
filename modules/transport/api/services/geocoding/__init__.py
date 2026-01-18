"""
Geocoding service - Address to coordinates conversion
"""

import logging
from typing import Optional, Dict, Any

from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

logger = logging.getLogger(__name__)

# Geolocator avec user agent
_geolocator = Nominatim(user_agent="transport-api/1.0", timeout=10)


async def geocode(
    address: str,
    country: str = "France"
) -> Optional[Dict[str, Any]]:
    """
    Convertit une adresse en coordonnées GPS

    Args:
        address: Adresse à géocoder
        country: Pays pour affiner la recherche

    Returns:
        Dictionnaire avec latitude, longitude et adresse formatée
        ou None si non trouvé
    """
    try:
        full_address = f"{address}, {country}"
        location = _geolocator.geocode(full_address)

        if location:
            return {
                "latitude": location.latitude,
                "longitude": location.longitude,
                "formatted_address": location.address,
                "raw": location.raw
            }

        logger.warning(f"Address not found: {address}")
        return None

    except GeocoderTimedOut:
        logger.error(f"Geocoding timeout for: {address}")
        return None
    except GeocoderServiceError as e:
        logger.error(f"Geocoding service error: {e}")
        return None
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
        return None


async def reverse_geocode(
    latitude: float,
    longitude: float
) -> Optional[Dict[str, Any]]:
    """
    Convertit des coordonnées GPS en adresse

    Args:
        latitude: Latitude
        longitude: Longitude

    Returns:
        Dictionnaire avec l'adresse ou None
    """
    try:
        location = _geolocator.reverse((latitude, longitude))

        if location:
            address = location.raw.get("address", {})
            return {
                "formatted_address": location.address,
                "street": address.get("road", ""),
                "house_number": address.get("house_number", ""),
                "city": address.get("city") or address.get("town") or address.get("village", ""),
                "postal_code": address.get("postcode", ""),
                "country": address.get("country", ""),
                "raw": location.raw
            }

        return None

    except GeocoderTimedOut:
        logger.error(f"Reverse geocoding timeout for: ({latitude}, {longitude})")
        return None
    except Exception as e:
        logger.error(f"Reverse geocoding error: {e}")
        return None


async def batch_geocode(
    addresses: list[str],
    country: str = "France"
) -> list[Optional[Dict[str, Any]]]:
    """
    Géocode plusieurs adresses

    Args:
        addresses: Liste d'adresses
        country: Pays

    Returns:
        Liste de résultats (certains peuvent être None)
    """
    results = []
    for address in addresses:
        result = await geocode(address, country)
        results.append(result)
    return results
