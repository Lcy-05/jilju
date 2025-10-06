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
import { Benefit, MapMarker, Coupon, Region } from '@/types';
import { API_ENDPOINTS, MAP_CONFIG } from '@/lib/constants';
import { detectRegion } from '@/hooks/use-region-detection';
import { calculateDistance, formatDistance, getBenefitValue } from '@/lib/geo-utils';
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
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  const { location, getCurrentLocation } = useLocation();
  const { user } = useAuth();

  // Initialize map center to Jeju Island by default
  useEffect(() => {
    if (!mapCenter) {
      // Always center on Jeju Island (33.4996, 126.5312)
      setMapCenter({ lat: 33.4996, lng: 126.5312 });
    }
  }, [mapCenter]);

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

  // Normalize benefits with parsed locations and distance (memoized)
  const normalizedBenefits = useMemo(() => {
    if (!benefitsData?.benefits) return [];
    
    const currentLat = location?.lat || mapCenter?.lat || 33.5102;
    const currentLng = location?.lng || mapCenter?.lng || 126.5219;
    
    const enrichedBenefits = benefitsData.benefits.map((benefit: Benefit) => {
      if (!benefit.merchant?.location) return null;
      
      // Parse location (could be string or object)
      let merchantLocation = benefit.merchant.location as any;
      if (typeof merchantLocation === 'string') {
        try {
          merchantLocation = JSON.parse(merchantLocation);
        } catch {
          return null;
        }
      }
      
      const lat = merchantLocation?.lat || 0;
      const lng = merchantLocation?.lng || 0;
      
      // Validate coordinates
      if (lat === 0 && lng === 0) return null;
      
      // Calculate distance
      const distance = calculateDistance(currentLat, currentLng, lat, lng);
      
      // Return benefit with parsed location and distance
      return {
        ...benefit,
        merchant: {
          ...benefit.merchant,
          location: { lat, lng }
        },
        distance,
        distanceFormatted: formatDistance(distance)
      };
    }).filter((b: any): b is Benefit & { distance: number; distanceFormatted: string } => b !== null);
    
    // Sort by distance first, then by benefit value (percent/amount)
    enrichedBenefits.sort((a: any, b: any) => {
      // Primary sort: distance
      const distanceDiff = a.distance - b.distance;
      if (Math.abs(distanceDiff) > 100) { // If distance difference > 100m, sort by distance
        return distanceDiff;
      }
      
      // Secondary sort: benefit value (higher is better)
      const valueA = getBenefitValue(a);
      const valueB = getBenefitValue(b);
      return valueB - valueA;
    });
    
    return enrichedBenefits;
  }, [benefitsData, location, mapCenter]);

  // Filter benefits by selected region
  useEffect(() => {
    const filterBenefitsByRegion = async () => {
      let filteredBenefits = normalizedBenefits;
      
      if (selectedRegion) {
        // Filter benefits asynchronously using region detection API
        const filteredResults = await Promise.all(
          normalizedBenefits.map(async (benefit: any) => {
            const location = benefit.merchant?.location as any;
            if (!location || typeof location !== 'object') return null;
            
            const region = await detectRegion(location.lat, location.lng);
            return region?.id === selectedRegion.id ? benefit : null;
          })
        );
        
        filteredBenefits = filteredResults.filter((b): b is typeof normalizedBenefits[0] => b !== null);
      }
      
      setVisibleBenefits(filteredBenefits);
    };
    
    filterBenefitsByRegion();
  }, [normalizedBenefits, selectedRegion]);

  // Convert normalized benefits to map markers
  const markers: MapMarker[] = useMemo(() => {
    return visibleBenefits
      .filter((benefit: any) => benefit.merchant?.location)
      .map((benefit: any) => {
        const location = benefit.merchant!.location as any;
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

  const handleMapClick = async (e: any) => {
    // Get clicked coordinates
    const lat = e.coord.y;
    const lng = e.coord.x;
    
    // Detect which region was clicked using API
    const region = await detectRegion(lat, lng);
    
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
    <div className="flex flex-col min-h-screen bg-background">
      <div className="map-container relative">
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
          zoom={11}
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
