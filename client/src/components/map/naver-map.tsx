import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MyLocationTwoTone, Add, Remove } from '@mui/icons-material';
import { useNaverMaps } from '@/hooks/use-naver-maps';
import { useLocation } from '@/hooks/use-location';
import { MapMarker } from '@/types';
import { cn } from '@/lib/utils';

interface NaverMapProps {
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (e: any) => void;
  onBoundsChanged?: (bounds: any) => void;
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  showControls?: boolean;
  className?: string;
}

export function NaverMap({
  onMarkerClick,
  onMapClick,
  onBoundsChanged,
  markers = [],
  center,
  zoom = 14,
  showControls = true,
  className
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapId] = useState(() => `naver-map-${Math.random().toString(36).substr(2, 9)}`);
  const { location, getCurrentLocation, isLoading: locationLoading } = useLocation();

  const {
    map,
    isLoaded,
    error,
    addMarkers,
    clearMarkers,
    panTo,
    getBounds,
    zoomIn,
    zoomOut
  } = useNaverMaps(mapId, {
    center: center || (location ? { lat: location.lat, lng: location.lng } : undefined),
    zoom,
    onMarkerClick,
    onMapClick,
    onBoundsChanged
  });

  // Update markers when they change
  useEffect(() => {
    if (isLoaded && markers.length > 0) {
      addMarkers(markers);
    } else if (isLoaded) {
      clearMarkers();
    }
  }, [isLoaded, markers, addMarkers, clearMarkers]);

  const handleCurrentLocation = () => {
    getCurrentLocation();
    if (location && map) {
      panTo(location.lat, location.lng, 16);
    }
  };

  const handleZoomIn = () => {
    zoomIn();
  };

  const handleZoomOut = () => {
    zoomOut();
  };

  if (error) {
    return (
      <div className={cn("w-full h-full bg-muted flex items-center justify-center", className)}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold mb-2">지도를 불러올 수 없습니다</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="mt-4 text-xs text-muted-foreground">
            <p>웹 서비스 URL: https://jilju.app</p>
            <p>네이버 지도 API 키가 필요합니다</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Map Container */}
      <div
        id={mapId}
        ref={mapRef}
        className="w-full h-full"
        data-testid="naver-map-container"
      />

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-sm text-muted-foreground">네이버 지도 초기화 중...</p>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>웹 서비스 URL: https://jilju.app</p>
            </div>
          </div>
        </div>
      )}

      {/* Map Controls - Only show when bottom sheet is collapsed */}
      {showControls && (
        <div 
          className={cn(
            "absolute flex flex-col gap-2 z-[10]",
            "transition-all duration-200",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          style={{
            bottom: 'calc(64px + 100px + env(safe-area-inset-bottom))', // Tab bar (64px) + Sheet min height (100px) + safe area
            right: '16px'
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCurrentLocation}
            disabled={locationLoading}
            className="w-11 h-11 p-0 rounded-lg shadow-lg bg-white hover:bg-gray-50 text-black"
            data-testid="button-current-location"
          >
            <MyLocationTwoTone className="w-5 h-5 text-black" />
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            className="w-11 h-11 p-0 rounded-lg shadow-lg bg-white hover:bg-gray-50 text-black"
            data-testid="button-zoom-in"
          >
            <Add className="w-6 h-6 text-black" />
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            className="w-11 h-11 p-0 rounded-lg shadow-lg bg-white hover:bg-gray-50 text-black"
            data-testid="button-zoom-out"
          >
            <Remove className="w-6 h-6 text-black" />
          </Button>
        </div>
      )}

    </div>
  );
}
