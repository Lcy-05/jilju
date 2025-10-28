import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LocationState } from '@/types';
import { APP_CONFIG, STORAGE_KEYS, ERROR_MESSAGES, API_ENDPOINTS } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';

interface UseLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
  saveToStorage?: boolean;
}

interface LocationError {
  code: number;
  message: string;
}

export function useLocation(options: UseLocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    watch = false,
    saveToStorage = true
  } = options;

  const [location, setLocation] = useState<LocationState | null>(() => {
    if (saveToStorage) {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_LOCATION);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const [error, setError] = useState<LocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Reverse geocoding query
  const { data: geocodeData } = useQuery<{ address: string }>({
    queryKey: [API_ENDPOINTS.GEOGRAPHY.REVERSE_GEOCODE, location?.lat, location?.lng],
    enabled: !!(location?.lat && location?.lng && location?.address?.includes(',')),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleLocationSuccess = useCallback(async (position: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    
    // Fetch region name from API
    let regionName = '로딩 중...';
    try {
      const response = await fetch(`${API_ENDPOINTS.GEOGRAPHY.REVERSE_GEOCODE}/${lat}/${lng}`);
      if (response.ok) {
        const data = await response.json();
        regionName = data.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch (error) {
      console.error('Failed to fetch region:', error);
    }
    
    // Set location with fetched address
    const locationState: LocationState = {
      lat,
      lng,
      address: regionName,
      region: regionName,
      accuracy
    };

    setLocation(locationState);
    setError(null);
    setIsLoading(false);

    if (saveToStorage) {
      localStorage.setItem(STORAGE_KEYS.USER_LOCATION, JSON.stringify(locationState));
    }
  }, [saveToStorage]);

  const handleLocationError = useCallback((err: GeolocationPositionError) => {
    let message = ERROR_MESSAGES.NETWORK_ERROR;
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = ERROR_MESSAGES.LOCATION_DENIED;
        break;
      case err.POSITION_UNAVAILABLE:
        message = '위치 정보를 사용할 수 없습니다.';
        break;
      case err.TIMEOUT:
        message = ERROR_MESSAGES.LOCATION_TIMEOUT;
        break;
    }

    setError({ code: err.code, message });
    setIsLoading(false);

    // Use default location as fallback
    const defaultLocation: LocationState = {
      ...APP_CONFIG.DEFAULT_LOCATION,
      address: APP_CONFIG.DEFAULT_LOCATION.name,
      region: APP_CONFIG.DEFAULT_LOCATION.name
    };
    
    setLocation(defaultLocation);
    
    if (saveToStorage) {
      localStorage.setItem(STORAGE_KEYS.USER_LOCATION, JSON.stringify(defaultLocation));
    }
  }, [saveToStorage]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ code: -1, message: '이 브라우저는 위치 서비스를 지원하지 않습니다.' });
      return;
    }

    setIsLoading(true);
    setError(null);

    const positionOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    };

    if (watch) {
      // Stop existing watch
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        positionOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        handleLocationError,
        positionOptions
      );
    }
  }, [enableHighAccuracy, timeout, maximumAge, watch, handleLocationSuccess, handleLocationError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const formatDistance = useCallback((distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  }, []);

  const isWithinRadius = useCallback((
    targetLat: number, 
    targetLng: number, 
    radiusKm: number
  ): boolean => {
    if (!location) return false;
    
    const distance = calculateDistance(location.lat, location.lng, targetLat, targetLng);
    return distance <= radiusKm;
  }, [location, calculateDistance]);

  // Update location with geocoded address when available
  useEffect(() => {
    if (geocodeData?.address && location && location.address.includes(',')) {
      const updatedLocation = {
        ...location,
        address: geocodeData.address,
        region: geocodeData.address
      };
      
      setLocation(updatedLocation);
      
      if (saveToStorage) {
        localStorage.setItem(STORAGE_KEYS.USER_LOCATION, JSON.stringify(updatedLocation));
      }
    }
  }, [geocodeData, location, saveToStorage]);

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    location,
    error,
    isLoading,
    getCurrentLocation,
    stopWatching,
    calculateDistance,
    formatDistance,
    isWithinRadius,
    isLocationAvailable: !!location,
    hasPermission: !error || error.code !== 1
  };
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export default useLocation;
