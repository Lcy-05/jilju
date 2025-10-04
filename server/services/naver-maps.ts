interface NaverGeocodingResult {
  addressElements: Array<{
    types: string[];
    longName: string;
    shortName: string;
    code: string;
  }>;
  jibunAddress: string;
  roadAddress: string;
  englishAddress: string;
  x: string; // longitude
  y: string; // latitude
}

interface NaverReverseGeocodingResult {
  region: {
    area1: { name: string; coords: { center: { x: number; y: number } } };
    area2: { name: string; coords: { center: { x: number; y: number } } };
    area3: { name: string; coords: { center: { x: number; y: number } } };
    area4: { name: string; coords: { center: { x: number; y: number } } };
  };
  land?: {
    type: string;
    number1: string;
    number2: string;
    addition0?: { type: string; value: string };
    addition1?: { type: string; value: string };
    addition2?: { type: string; value: string };
    addition3?: { type: string; value: string };
    addition4?: { type: string; value: string };
  };
}

class NaverMapsService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly geocodingUrl = 'https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode';
  private readonly reverseGeocodingUrl = 'https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc';

  constructor() {
    this.clientId = process.env.NAVER_MAPS_CLIENT_ID || '';
    this.clientSecret = process.env.NAVER_MAPS_CLIENT_SECRET || '';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Naver Maps API credentials not provided. Geographic services will be limited.');
    }
  }

  async geocode(address: string): Promise<NaverGeocodingResult[]> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Naver Maps API credentials not configured');
    }

    try {
      const response = await fetch(`${this.geocodingUrl}?query=${encodeURIComponent(address)}`, {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': this.clientId,
          'X-NCP-APIGW-API-KEY': this.clientSecret
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${data.errorMessage || 'Unknown error'}`);
      }

      return data.addresses || [];
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error('Address lookup failed');
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      // Fallback to simple coordinate display
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    try {
      const coords = `${lng},${lat}`;
      const response = await fetch(
        `${this.reverseGeocodingUrl}?coords=${coords}&output=json&orders=roadaddr,addr`,
        {
          headers: {
            'X-NCP-APIGW-API-KEY-ID': this.clientId,
            'X-NCP-APIGW-API-KEY': this.clientSecret
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status.code !== 0) {
        throw new Error(`Reverse geocoding failed: ${data.status.message}`);
      }

      const results = data.results;
      if (results && results.length > 0) {
        const result = results[0] as NaverReverseGeocodingResult;
        
        // Build address string from region components
        const region = result.region;
        let address = '';
        
        if (region.area1?.name) address += region.area1.name;
        if (region.area2?.name) address += ' ' + region.area2.name;
        if (region.area3?.name) address += ' ' + region.area3.name;
        if (region.area4?.name) address += ' ' + region.area4.name;

        // Return the area3 (동/읍/면) for location chip
        return region.area3?.name || region.area2?.name || address.trim() || '알 수 없는 지역';
      }

      return '알 수 없는 지역';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return '알 수 없는 지역';
    }
  }

  generateStaticMapUrl(lat: number, lng: number, width = 400, height = 300, zoom = 14): string {
    if (!this.clientId) {
      return `https://via.placeholder.com/${width}x${height}?text=Map+Unavailable`;
    }

    const params = new URLSearchParams({
      w: width.toString(),
      h: height.toString(),
      center: `${lng},${lat}`,
      level: zoom.toString(),
      format: 'jpg',
      markers: `type:t|size:mid|pos:${lng} ${lat}|label:위치`
    });

    return `https://naveropenapi.apigw.ntruss.com/map-static/v2/raster?${params.toString()}`;
  }

  getDirectionsUrl(fromLat: number, fromLng: number, toLat: number, toLng: number): string {
    // Naver Map app deep link for directions
    const params = new URLSearchParams({
      slng: fromLng.toString(),
      slat: fromLat.toString(),
      sname: '출발지',
      dlng: toLng.toString(),
      dlat: toLat.toString(),
      dname: '목적지',
      pathType: '0', // 0: 최적, 1: 최단거리
      showMap: 'true'
    });

    return `nmap://route/walk?${params.toString()}`;
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula for calculating distance between two points
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
}

export const naverMapsService = new NaverMapsService();
