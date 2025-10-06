import { useQuery } from '@tanstack/react-query';
import { Region } from '@/types';

interface RegionDetectionParams {
  lat: number;
  lng: number;
  enabled?: boolean;
}

export function useRegionDetection({ lat, lng, enabled = true }: RegionDetectionParams) {
  return useQuery<{ region: Region | null }>({
    queryKey: ['/api/regions/detect', lat, lng],
    queryFn: async () => {
      const response = await fetch(`/api/regions/detect?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error('Failed to detect region');
      }
      return response.json();
    },
    enabled: enabled && !isNaN(lat) && !isNaN(lng),
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}

export async function detectRegion(lat: number, lng: number): Promise<Region | null> {
  try {
    const response = await fetch(`/api/regions/detect?lat=${lat}&lng=${lng}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.region || null;
  } catch (error) {
    console.error('Failed to detect region:', error);
    return null;
  }
}
