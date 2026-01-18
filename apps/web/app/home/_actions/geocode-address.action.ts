'use server';

/**
 * Action pour géocoder une adresse en coordonnées lat/lng
 * Utilise l'API Nominatim (OpenStreetMap) - gratuite et sans clé API
 */

interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name: string;
}

export async function geocodeAddress(
  address: string
): Promise<{ success: boolean; data?: GeocodeResult; error?: string }> {
  try {
    if (!address || address.trim() === '') {
      return {
        success: false,
        error: 'Adresse vide',
      };
    }

    // Utiliser l'API Nominatim d'OpenStreetMap
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TransportManagementApp/1.0',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Erreur lors de la géolocalisation',
      };
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return {
        success: false,
        error: 'Adresse non trouvée',
      };
    }

    const result = results[0];

    return {
      success: true,
      data: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        display_name: result.display_name,
      },
    };
  } catch (error) {
    console.error('Erreur géocodage:', error);
    return {
      success: false,
      error: 'Erreur lors de la géolocalisation',
    };
  }
}
