import { storage } from "../storage";

interface LocationInfo {
  lat: number;
  lng: number;
  address: string;
  region: string;
  accuracy?: number;
}

interface GeofenceResult {
  withinRadius: boolean;
  distance: number;
  distanceFormatted: string;
}

class GeolocationService {
  async getCurrentLocation(ipAddress: string): Promise<LocationInfo | null> {
    // In a real implementation, you might use IP geolocation services
    // For now, return a default Seoul location
    try {
      // You could integrate with services like MaxMind, IPStack, etc.
      return {
        lat: 37.5665,
        lng: 126.9780,
        address: "서울시 중구",
        region: "서울특별시 중구",
        accuracy: 1000
      };
    } catch (error) {
      console.error('IP geolocation failed:', error);
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      // Try to find region from database first
      const region = await storage.getRegionByLocation(lat, lng);
      if (region) {
        return region.name;
      }

      // Fallback to coordinate-based region name
      return await storage.reverseGeocode(lat, lng);
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return "알 수 없는 지역";
    }
  }

  checkGeofence(
    userLat: number, 
    userLng: number, 
    targetLat: number, 
    targetLng: number, 
    radiusMeters: number
  ): GeofenceResult {
    const distance = this.calculateDistance(userLat, userLng, targetLat, targetLng);
    const distanceMeters = distance * 1000;

    return {
      withinRadius: distanceMeters <= radiusMeters,
      distance: distanceMeters,
      distanceFormatted: this.formatDistance(distance)
    };
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  }

  getBoundingBox(lat: number, lng: number, radiusKm: number): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } {
    // Rough calculation for bounding box
    const latDiff = radiusKm / 111; // 1 degree lat ≈ 111 km
    const lngDiff = radiusKm / (111 * Math.cos(this.toRadians(lat)));

    return {
      minLat: lat - latDiff,
      maxLat: lat + latDiff,
      minLng: lng - lngDiff,
      maxLng: lng + lngDiff
    };
  }

  isWithinKorea(lat: number, lng: number): boolean {
    // Rough bounds for South Korea
    return lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
  }

  getTimeZone(): string {
    return "Asia/Seoul";
  }

  getCurrentKoreanTime(): Date {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  }

  parseCoordinates(locationString: string): { lat: number; lng: number } | null {
    try {
      // Handle various coordinate formats
      const patterns = [
        /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/, // "37.5665, 126.9780"
        /^POINT\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)$/i, // PostGIS POINT format
      ];

      for (const pattern of patterns) {
        const match = locationString.trim().match(pattern);
        if (match) {
          const lng = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          
          if (this.isValidCoordinate(lat, lng)) {
            return { lat, lng };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Coordinate parsing failed:', error);
      return null;
    }
  }

  formatCoordinates(lat: number, lng: number, format: 'decimal' | 'dms' = 'decimal'): string {
    if (format === 'dms') {
      const latDMS = this.toDMS(lat, true);
      const lngDMS = this.toDMS(lng, false);
      return `${latDMS}, ${lngDMS}`;
    }
    
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  }

  private toDMS(coordinate: number, isLatitude: boolean): string {
    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

    let direction;
    if (isLatitude) {
      direction = coordinate >= 0 ? 'N' : 'S';
    } else {
      direction = coordinate >= 0 ? 'E' : 'W';
    }

    return `${degrees}°${minutes}'${seconds}"${direction}`;
  }
}

export const geolocationService = new GeolocationService();
