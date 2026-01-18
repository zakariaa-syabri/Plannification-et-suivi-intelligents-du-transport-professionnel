/**
 * Utility functions for fetching real road routes
 * Uses OSRM (Open Source Routing Machine) public API
 */

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export interface RouteResult {
  coordinates: RouteCoordinate[];
  distance: number; // meters
  duration: number; // seconds
}

/**
 * Fetch route geometry between multiple waypoints using OSRM
 * Returns the actual road path, not straight lines
 */
export async function fetchRoute(
  waypoints: RouteCoordinate[]
): Promise<RouteResult | null> {
  if (waypoints.length < 2) {
    return null;
  }

  try {
    // Format coordinates for OSRM: lng,lat;lng,lat;...
    const coordinates = waypoints
      .map(wp => `${wp.lng},${wp.lat}`)
      .join(';');

    // Use OSRM public demo server
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('OSRM API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('OSRM returned no routes:', data.code);
      return null;
    }

    const route = data.routes[0];

    // Extract coordinates from GeoJSON geometry
    // GeoJSON uses [lng, lat] format, we need to convert to {lat, lng}
    const routeCoordinates: RouteCoordinate[] = route.geometry.coordinates.map(
      (coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0],
      })
    );

    return {
      coordinates: routeCoordinates,
      distance: route.distance,
      duration: route.duration,
    };
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

/**
 * Fetch route between two points
 */
export async function fetchRouteBetweenPoints(
  from: RouteCoordinate,
  to: RouteCoordinate
): Promise<RouteResult | null> {
  return fetchRoute([from, to]);
}

/**
 * Fetch complete route through all mission stops
 */
export async function fetchMissionRoute(
  vehiclePosition: RouteCoordinate | null,
  stops: Array<{ latitude: number; longitude: number }>
): Promise<RouteResult | null> {
  const waypoints: RouteCoordinate[] = [];

  // Add vehicle position as start if available
  if (vehiclePosition) {
    waypoints.push(vehiclePosition);
  }

  // Add all stops
  for (const stop of stops) {
    waypoints.push({
      lat: stop.latitude,
      lng: stop.longitude,
    });
  }

  return fetchRoute(waypoints);
}
