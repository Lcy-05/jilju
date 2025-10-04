import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NaverMap } from '@/components/map/naver-map';
import { BottomSheet } from '@/components/map/bottom-sheet';
import { BenefitModal } from '@/components/benefit/benefit-modal';
import { CouponModal } from '@/components/coupon/coupon-modal';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { Header } from '@/components/layout/header';
import { useLocation } from '@/hooks/use-location';
import { useAuth } from '@/lib/auth';
import { Benefit, MapMarker, Coupon } from '@/types';
import { API_ENDPOINTS, MAP_CONFIG, JEJU_REGIONS } from '@/lib/constants';
import { findJejuRegion, JejuRegion } from '@/lib/jeju-regions';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export default function Map() {
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>();
  const [visibleBenefits, setVisibleBenefits] = useState<Benefit[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<JejuRegion | null>(null);

  const { location, getCurrentLocation } = useLocation();
  const { user } = useAuth();

  // Initialize map center (check URL params for region)
  useEffect(() => {
    // Check URL params for region parameter
    const urlParams = new URLSearchParams(window.location.search);
    const regionParam = urlParams.get('region');
    
    // If region=jeju, center on Jeju
    if (regionParam === 'jeju' && !mapCenter) {
      setMapCenter(JEJU_REGIONS.city_hall.center);
      return;
    }
    
    // Otherwise use current location
    if (location && !mapCenter) {
      setMapCenter({ lat: location.lat, lng: location.lng });
    }
  }, [location, mapCenter]);

  // Get benefits in current map bounds (BBOX search)
  const { data: benefitsData, isLoading } = useQuery({
    queryKey: [API_ENDPOINTS.BENEFITS.SEARCH, 'bbox', currentBounds],
    queryFn: async () => {
      if (!currentBounds) return { benefits: [] };
      
      // Convert bounds to bbox string
      const bbox = `${currentBounds.getSW().y},${currentBounds.getSW().x},${currentBounds.getNE().y},${currentBounds.getNE().x}`;
      
      const params = new URLSearchParams({
        bbox,
        limit: MAP_CONFIG.MARKER_LIMIT.toString()
      });

      const response = await fetch(`${API_ENDPOINTS.BENEFITS.SEARCH}?${params}`);
      return response.json();
    },
    enabled: !!currentBounds,
    staleTime: 30 * 1000, // 30 seconds for map data
  });

  // Normalize benefits with parsed locations (memoized)
  const normalizedBenefits = useMemo(() => {
    if (!benefitsData?.benefits) return [];
    
    return benefitsData.benefits.map((benefit: Benefit) => {
      if (!benefit.merchant?.location) return null;
      
      // Parse location (could be string or object)
      let location = benefit.merchant.location as any;
      if (typeof location === 'string') {
        try {
          location = JSON.parse(location);
        } catch {
          return null;
        }
      }
      
      const lat = location?.lat || 0;
      const lng = location?.lng || 0;
      
      // Validate coordinates
      if (lat === 0 && lng === 0) return null;
      
      // Return benefit with parsed location
      return {
        ...benefit,
        merchant: {
          ...benefit.merchant,
          location: { lat, lng } // Replace string with parsed object
        }
      };
    }).filter((b): b is Benefit => b !== null);
  }, [benefitsData]);

  // Filter benefits by selected region
  useEffect(() => {
    let filteredBenefits = normalizedBenefits;
    
    if (selectedRegion) {
      filteredBenefits = normalizedBenefits.filter((benefit) => {
        const location = benefit.merchant?.location as any;
        if (!location || typeof location !== 'object') return false;
        
        const coords = { lat: location.lat, lng: location.lng };
        const region = findJejuRegion(coords);
        return region?.id === selectedRegion.id;
      });
    }
    
    setVisibleBenefits(filteredBenefits);
  }, [normalizedBenefits, selectedRegion]);

  // Convert normalized benefits to map markers
  const markers: MapMarker[] = useMemo(() => {
    return visibleBenefits
      .filter(benefit => benefit.merchant?.location)
      .map(benefit => {
        const location = benefit.merchant.location as any;
        return {
          id: benefit.id,
          position: { lat: location.lat, lng: location.lng },
          title: benefit.title,
          type: 'benefit',
          data: benefit
        };
      });
  }, [visibleBenefits]);

  const handleBoundsChanged = (bounds: any) => {
    // Throttle bounds changes to avoid too many API calls
    const timeoutId = setTimeout(() => {
      setCurrentBounds(bounds);
    }, MAP_CONFIG.SEARCH_RADIUS_KM * 100); // 300ms from specification

    return () => clearTimeout(timeoutId);
  };

  const handleMapClick = (e: any) => {
    // Get clicked coordinates
    const coords = { lat: e.coord.y, lng: e.coord.x };
    
    // Find which region was clicked
    const region = findJejuRegion(coords);
    
    if (region) {
      setSelectedRegion(region);
    }
  };

  const handleMarkerClick = (marker: MapMarker) => {
    if (marker.type === 'benefit') {
      setSelectedBenefit(marker.data as Benefit);
      setIsBenefitModalOpen(true);
    }
  };

  const handleBenefitClick = (benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setIsBenefitModalOpen(true);
  };

  const handleCouponIssue = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsCouponModalOpen(true);
  };

  const handleViewList = () => {
    // Navigate to discover page with current location
    window.location.href = '/discover';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="map-container">
        {/* Region Filter Badge */}
        {selectedRegion && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
            <Badge 
              variant="secondary" 
              className="px-4 py-2 text-sm font-semibold shadow-lg bg-background/95 backdrop-blur-sm"
              data-testid="badge-selected-region"
            >
              {selectedRegion.name}
              <button
                onClick={() => setSelectedRegion(null)}
                className="ml-2 hover:bg-muted rounded-full p-0.5"
                data-testid="button-clear-region"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          </div>
        )}

        <NaverMap
          center={mapCenter}
          zoom={MAP_CONFIG.DEFAULT_ZOOM}
          markers={markers}
          onMarkerClick={handleMarkerClick}
          onMapClick={handleMapClick}
          onBoundsChanged={handleBoundsChanged}
          className="w-full h-full"
        />

        {/* Bottom Sheet with benefits list */}
        <BottomSheet
          benefits={visibleBenefits}
          onBenefitClick={handleBenefitClick}
          onViewList={handleViewList}
          hasMore={false}
          isLoading={isLoading}
        />
      </div>

      <BottomNavigation />

      {/* Modals */}
      <BenefitModal
        benefit={selectedBenefit}
        isOpen={isBenefitModalOpen}
        onClose={() => setIsBenefitModalOpen(false)}
        onCouponIssue={handleCouponIssue}
      />

      <CouponModal
        coupon={selectedCoupon}
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        onViewInWallet={() => window.location.href = '/saved?tab=coupons'}
      />
    </div>
  );
}
