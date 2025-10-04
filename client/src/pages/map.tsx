import { useState, useEffect } from 'react';
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
import { API_ENDPOINTS, MAP_CONFIG } from '@/lib/constants';

export default function Map() {
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>();
  const [visibleBenefits, setVisibleBenefits] = useState<Benefit[]>([]);

  const { location, getCurrentLocation } = useLocation();
  const { user } = useAuth();

  // Initialize map center
  useEffect(() => {
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

  // Update visible benefits when data changes
  useEffect(() => {
    if (benefitsData?.benefits) {
      setVisibleBenefits(benefitsData.benefits);
    }
  }, [benefitsData]);

  // Convert benefits to map markers
  const markers: MapMarker[] = visibleBenefits
    .filter(benefit => benefit.merchant?.location) // Filter out benefits without location
    .map(benefit => {
      const location = benefit.merchant.location as any;
      return {
        id: benefit.id,
        position: {
          lat: typeof location === 'object' ? location.lat : 0,
          lng: typeof location === 'object' ? location.lng : 0
        },
        title: benefit.title,
        type: 'benefit',
        data: benefit
      };
    });

  const handleBoundsChanged = (bounds: any) => {
    // Throttle bounds changes to avoid too many API calls
    const timeoutId = setTimeout(() => {
      setCurrentBounds(bounds);
    }, MAP_CONFIG.SEARCH_RADIUS_KM * 100); // 300ms from specification

    return () => clearTimeout(timeoutId);
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
        <NaverMap
          center={mapCenter}
          zoom={MAP_CONFIG.DEFAULT_ZOOM}
          markers={markers}
          onMarkerClick={handleMarkerClick}
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
