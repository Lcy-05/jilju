import { useState, useEffect, useCallback, useRef } from 'react';
import { MapMarker, NaverMapConfig } from '@/types';
import { MAP_CONFIG, SERVICE_URLS, CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/constants';

interface UseNaverMapsOptions {
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapClick?: (e: any) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  onBoundsChanged?: (bounds: any) => void;
}

interface NaverMapInstance {
  setCenter: (latlng: any) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  getBounds: () => any;
  addListener: (event: string, handler: Function) => void;
  removeListener: (listeners: any) => void;
}

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (element: HTMLElement, options: any) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => any;
        LatLngBounds: new (sw: any, ne: any) => any;
        Point: new (x: number, y: number) => any;
        Size: new (width: number, height: number) => any;
        Marker: new (options: any) => any;
        InfoWindow: new (options: any) => any;
        MarkerClustering: new (options: any) => any;
        Position: any;
        ZoomControlStyle: any;
        Event: {
          addListener: (target: any, type: string, listener: Function) => any;
          removeListener: (listener: any) => void;
          trigger: (target: any, type: string, data?: any) => void;
        };
        Service: {
          geocode: (options: any, callback: Function) => void;
          reverseGeocode: (options: any, callback: Function) => void;
        };
        drawing: {
          DrawingManager: new (options: any) => any;
        };
        visualization: {
          HeatMap: new (options: any) => any;
        };
        EPSG3857: any;
        TransCoord: any;
      };
    };
  }
}

export function useNaverMaps(containerId: string, options: UseNaverMapsOptions = {}) {
  const [map, setMap] = useState<NaverMapInstance | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [clusterer, setClusterer] = useState<any>(null);
  
  const listenersRef = useRef<any[]>([]);
  const markersRef = useRef<Map<string, any>>(new Map());

  const {
    center = { lat: 33.4996, lng: 126.5312 },
    zoom = 11,
    onMapClick,
    onMarkerClick,
    onBoundsChanged
  } = options;

  // Load Naver Maps script
  useEffect(() => {
    const loadNaverMaps = async () => {
      try {
        // Check if already loaded
        if (window.naver?.maps) {
          setIsLoaded(true);
          return;
        }

        // Create script element for NCP Maps API
        const script = document.createElement('script');
        script.type = 'text/javascript';
        // Use new NCP Maps API URL with ncpClientId parameter
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${import.meta.env.VITE_NAVER_MAPS_CLIENT_ID}`;
        
        script.onload = () => {
          setIsLoaded(true);
        };
        
        script.onerror = () => {
          setError('네이버 지도를 로드할 수 없습니다.');
        };

        document.head.appendChild(script);
      } catch (err) {
        setError('네이버 지도 초기화 중 오류가 발생했습니다.');
      }
    };

    loadNaverMaps();
  }, []);

  // Initialize map when script is loaded
  useEffect(() => {
    if (!isLoaded || map) return;

    try {
      const container = document.getElementById(containerId);
      if (!container) {
        setError('지도 컨테이너를 찾을 수 없습니다.');
        return;
      }

      const mapInstance = new window.naver.maps.Map(container, {
        center: new window.naver.maps.LatLng(center.lat, center.lng),
        zoom,
        minZoom: MAP_CONFIG.MIN_ZOOM,
        maxZoom: MAP_CONFIG.MAX_ZOOM,
        draggable: true,
        pinchZoom: true,
        scrollWheel: true,
        keyboardShortcuts: true,
        disableKineticPan: false,
        mapTypeControl: false,
        mapDataControl: false,
        logoControl: true,
        scaleControl: true,
        zoomControl: false,
        scaleControlOptions: {
          position: window.naver.maps.Position.BOTTOM_RIGHT
        },
        logoControlOptions: {
          position: window.naver.maps.Position.BOTTOM_LEFT
        }
      });

      // Add event listeners
      if (onBoundsChanged) {
        const boundsListener = window.naver.maps.Event.addListener(mapInstance, 'bounds_changed', () => {
          const bounds = mapInstance.getBounds();
          onBoundsChanged(bounds);
        });
        listenersRef.current.push(boundsListener);
        
        // Trigger initial bounds change to load data on mount
        setTimeout(() => {
          const bounds = mapInstance.getBounds();
          onBoundsChanged(bounds);
        }, 100);
      }

      if (onMapClick) {
        const clickListener = window.naver.maps.Event.addListener(mapInstance, 'click', onMapClick);
        listenersRef.current.push(clickListener);
      }

      // Initialize marker clusterer
      if (window.naver.maps.MarkerClustering) {
        const clusterInstance = new window.naver.maps.MarkerClustering({
          minClusterSize: 2,
          maxZoom: MAP_CONFIG.CLUSTER_MIN_ZOOM,
          map: mapInstance,
          markers: [],
          disableClickZoom: false,
          gridSize: 120,
          icons: [{
            content: '<div class="cluster-marker">📍</div>',
            size: new window.naver.maps.Size(40, 40),
            anchor: new window.naver.maps.Point(20, 20)
          }],
          indexGenerator: [10, 100, 200, 500, 1000],
          stylingFunction: (clusterMarker: any, count: number) => {
            clusterMarker.getElement().innerHTML = `<div class="cluster-marker">${count}</div>`;
          }
        });
        setClusterer(clusterInstance);
      }

      setMap(mapInstance);
      setError(null);
    } catch (err) {
      setError('지도 초기화 중 오류가 발생했습니다.');
      console.error('Naver Maps initialization error:', err);
    }
  }, [isLoaded, containerId, center.lat, center.lng, zoom, onBoundsChanged, onMapClick]);

  // Add markers to map
  const addMarkers = useCallback((markerData: MapMarker[]) => {
    if (!map || !window.naver?.maps) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    const newMarkers: any[] = [];

    markerData.forEach(markerInfo => {
      try {
        // Get category name from marker data
        const categoryName = (markerInfo.data as any)?.merchant?.category?.name || 
                            (markerInfo.data as any)?.category?.name || 
                            '기타';
        
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(markerInfo.position.lat, markerInfo.position.lng),
          map: map,
          title: markerInfo.title,
          icon: {
            content: getMarkerIcon(markerInfo.type, categoryName),
            size: new window.naver.maps.Size(40, 40),
            anchor: new window.naver.maps.Point(20, 40)
          },
          zIndex: markerInfo.type === 'benefit' ? 100 : 50
        });

        // Add click listener
        if (onMarkerClick) {
          window.naver.maps.Event.addListener(marker, 'click', () => {
            onMarkerClick(markerInfo);
          });
        }

        markersRef.current.set(markerInfo.id, marker);
        newMarkers.push(marker);
      } catch (err) {
        console.error('Error adding marker:', err);
      }
    });

    setMarkers(newMarkers);

    // Update clusterer if available
    if (clusterer) {
      clusterer.setMarkers(newMarkers);
    }
  }, [map, onMarkerClick, clusterer]);

  // Remove markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();
    setMarkers([]);
    
    if (clusterer) {
      clusterer.setMarkers([]);
    }
  }, [clusterer]);

  // Move map to location
  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    if (!map) return;
    
    const latlng = new window.naver.maps.LatLng(lat, lng);
    map.setCenter(latlng);
    
    if (zoom !== undefined) {
      map.setZoom(zoom);
    }
  }, [map]);

  // Get current bounds
  const getBounds = useCallback(() => {
    if (!map) return null;
    return map.getBounds();
  }, [map]);

  // Create info window
  const showInfoWindow = useCallback((lat: number, lng: number, content: string) => {
    if (!map || !window.naver?.maps) return null;

    const infoWindow = new window.naver.maps.InfoWindow({
      content,
      maxWidth: 300,
      backgroundColor: "var(--card)",
      borderColor: "var(--border)",
      borderWidth: 1,
      anchorSize: new window.naver.maps.Size(10, 10),
      anchorSkew: true,
      anchorColor: "var(--card)",
      pixelOffset: new window.naver.maps.Point(0, -10)
    });

    infoWindow.open(map, new window.naver.maps.LatLng(lat, lng));
    return infoWindow;
  }, [map]);

  const zoomIn = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom + 1);
  }, [map]);

  const zoomOut = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom - 1);
  }, [map]);

  const getZoom = useCallback(() => {
    if (!map) return zoom;
    return map.getZoom();
  }, [map, zoom]);

  // Cleanup
  useEffect(() => {
    return () => {
      listenersRef.current.forEach(listener => {
        window.naver?.maps?.Event?.removeListener(listener);
      });
      clearMarkers();
    };
  }, [clearMarkers]);

  return {
    map,
    isLoaded: isLoaded && !!map,
    error,
    markers,
    addMarkers,
    clearMarkers,
    panTo,
    getBounds,
    showInfoWindow,
    clusterer,
    zoomIn,
    zoomOut,
    getZoom
  };
}

function getMarkerIcon(type: 'benefit' | 'merchant', categoryName?: string): string {
  // Get category icon and color
  const icon = categoryName && CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS] 
    ? CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS]
    : '🏪';
  
  const color = categoryName && CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS]
    ? CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS]
    : CATEGORY_COLORS['기타'];

  const baseStyle = `
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: white;
    border: 3px solid white;
    background: ${color};
    transition: transform 0.2s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  // Check if icon is an image path (string starting with /)
  const isImagePath = typeof icon === 'string' && icon.startsWith('/');
  
  if (isImagePath) {
    return `
      <div style="${baseStyle}">
        <img src="${icon}" alt="${categoryName}" style="width: 24px; height: 24px; object-fit: contain;" />
      </div>
    `;
  }

  return `<div style="${baseStyle}">${icon}</div>`;
}

export default useNaverMaps;
