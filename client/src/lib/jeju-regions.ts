import { JEJU_REGIONS } from './constants';

interface Coordinates {
  lat: number;
  lng: number;
}

export interface JejuRegion {
  id: string;
  name: string;
  center: Coordinates;
  radius: number;
  areas: readonly string[];
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function getDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Find which Jeju region a coordinate belongs to
 * Returns the closest region if within radius, null otherwise
 */
export function findJejuRegion(coords: Coordinates): JejuRegion | null {
  let closestRegion: JejuRegion | null = null;
  let closestDistance = Infinity;

  for (const region of Object.values(JEJU_REGIONS)) {
    const distance = getDistance(coords, region.center);
    
    // Check if within region radius
    if (distance <= region.radius && distance < closestDistance) {
      closestRegion = region as JejuRegion;
      closestDistance = distance;
    }
  }

  return closestRegion;
}

/**
 * Find region by name or keyword
 */
export function findRegionByName(name: string): JejuRegion | null {
  const normalizedName = name.trim();
  
  // Try to match region name
  for (const region of Object.values(JEJU_REGIONS)) {
    if (region.name === normalizedName || region.id === normalizedName) {
      return region as JejuRegion;
    }
  }
  
  // Try to match area name
  for (const region of Object.values(JEJU_REGIONS)) {
    if ((region.areas as readonly string[]).includes(normalizedName)) {
      return region as JejuRegion;
    }
  }
  
  return null;
}

/**
 * Get all Jeju regions as array
 */
export function getAllJejuRegions(): JejuRegion[] {
  return Object.values(JEJU_REGIONS) as JejuRegion[];
}

/**
 * Check if coordinates are within Jeju Island
 */
export function isInJeju(coords: Coordinates): boolean {
  // Rough bounding box for Jeju Island
  const JEJU_BOUNDS = {
    north: 33.57,
    south: 33.20,
    east: 126.95,
    west: 126.15
  };
  
  return coords.lat >= JEJU_BOUNDS.south &&
         coords.lat <= JEJU_BOUNDS.north &&
         coords.lng >= JEJU_BOUNDS.west &&
         coords.lng <= JEJU_BOUNDS.east;
}
