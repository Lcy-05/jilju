import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import useEmblaCarousel from 'embla-carousel-react';
import { Header } from '@/components/layout/header';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { BenefitCard } from '@/components/benefit/benefit-card';
import { BenefitModal } from '@/components/benefit/benefit-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useLocation } from '@/hooks/use-location';
import { useAuth } from '@/lib/auth';
import { Benefit, Category } from '@/types';
import { API_ENDPOINTS, CATEGORY_ICONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Home() {
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [selectedBannerIndex, setSelectedBannerIndex] = useState(0);
  const { location } = useLocation();
  const { user } = useAuth();
  
  // Initialize Embla Carousel for banners
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: true });

  // Get categories for quick access
  const { data: categories } = useQuery({
    queryKey: [API_ENDPOINTS.CATEGORIES],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Get home banners for carousel
  const { data: bannersData } = useQuery({
    queryKey: ['/api/banners'],
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Get popular benefits (HP_SCORE algorithm)
  const { data: popularBenefits, isLoading: popularLoading } = useQuery({
    queryKey: [API_ENDPOINTS.BENEFITS.POPULAR, location?.lat, location?.lng],
    enabled: !!(location?.lat && location?.lng),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get recommended benefits for authenticated users
  const { data: recommendedBenefits } = useQuery({
    queryKey: [API_ENDPOINTS.BENEFITS.RECOMMENDED, location?.lat, location?.lng],
    enabled: !!(user && location?.lat && location?.lng),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get new benefits
  const { data: newBenefits } = useQuery({
    queryKey: [API_ENDPOINTS.BENEFITS.SEARCH, 'new', location?.lat, location?.lng],
    queryFn: async () => {
      if (!location?.lat || !location?.lng) return { benefits: [] };
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        sort: 'newest',
        limit: '10'
      });
      const response = await fetch(`${API_ENDPOINTS.BENEFITS.SEARCH}?${params}`);
      return response.json();
    },
    enabled: !!(location?.lat && location?.lng),
    staleTime: 5 * 60 * 1000,
  });

  // Get ending soon benefits
  const { data: endingSoonBenefits } = useQuery({
    queryKey: [API_ENDPOINTS.BENEFITS.SEARCH, 'ending', location?.lat, location?.lng],
    queryFn: async () => {
      if (!location?.lat || !location?.lng) return { benefits: [] };
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        sort: 'ending',
        limit: '10'
      });
      const response = await fetch(`${API_ENDPOINTS.BENEFITS.SEARCH}?${params}`);
      return response.json();
    },
    enabled: !!(location?.lat && location?.lng),
    staleTime: 5 * 60 * 1000,
  });

  const handleBenefitClick = (benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setIsBenefitModalOpen(true);
  };

  const handleCategoryClick = (category: Category) => {
    // Navigate to discover page with category filter
    window.location.href = `/discover?categories=${category.id}`;
  };

  const displayCategories = (categories as any)?.categories?.slice(0, 5) || [];
  const nearbyBenefits = (popularBenefits as any)?.benefits || [];
  const newItems = (newBenefits as any)?.benefits || [];
  const endingItems = (endingSoonBenefits as any)?.benefits || [];
  const banners = (bannersData as any)?.banners || [];

  // Auto-slide carousel every 5 seconds
  useEffect(() => {
    if (!emblaApi || banners.length === 0) return;

    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => clearInterval(autoplay);
  }, [emblaApi, banners.length]);

  // Track current banner index
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedBannerIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleBannerClick = (banner: any) => {
    if (banner.linkUrl) {
      window.location.href = banner.linkUrl;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header
        onSearchSubmit={(query) => {
          window.location.href = `/discover?q=${encodeURIComponent(query)}`;
        }}
      />

      <main className="animate-fade-in">
        {/* Banner Carousel */}
        <section className="px-4 pt-4">
          {banners.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl" ref={emblaRef}>
                <div className="flex">
                  {banners.map((banner: any, index: number) => (
                    <div 
                      key={banner.id} 
                      className="flex-[0_0_100%] min-w-0 relative cursor-pointer"
                      onClick={() => handleBannerClick(banner)}
                      data-testid={`banner-item-${index}`}
                    >
                      <img 
                        src={banner.imageUrl} 
                        alt={banner.title} 
                        className="w-full h-40 object-cover" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                        <div>
                          <h2 className="text-white text-xl font-bold">{banner.title}</h2>
                          {banner.subtitle && (
                            <p className="text-white/90 text-sm mt-1">{banner.subtitle}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Carousel Dots */}
              <div className="flex justify-center gap-1.5 mt-3">
                {banners.map((_: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => emblaApi?.scrollTo(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === selectedBannerIndex ? "bg-primary" : "bg-muted"
                    )}
                    data-testid={`button-banner-dot-${index}`}
                    aria-label={`배너 ${index + 1}번으로 이동`}
                  />
                ))}
              </div>
            </>
          ) : (
            // Fallback banner when no banners in database
            <div className="relative overflow-hidden rounded-xl">
              <img 
                src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400" 
                alt="질주 배너" 
                className="w-full h-40 object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <div>
                  <h2 className="text-white text-xl font-bold">주변 혜택을 빠르게 찾아보세요</h2>
                  <p className="text-white/90 text-sm mt-1">최대 50% 할인 혜택 지금 확인</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Category Quick Access */}
        <section className="px-4 py-5">
          <div className="grid grid-cols-5 gap-4">
            {displayCategories.map((category: Category, index: number) => (
              <Button
                key={category.id}
                variant="ghost"
                className="flex flex-col items-center gap-2 h-auto p-2"
                onClick={() => handleCategoryClick(category)}
                data-testid={`button-category-${index}`}
              >
                <div className="w-14 h-14 flex items-center justify-center">
                  <span className="text-3xl">
                    {(CATEGORY_ICONS as any)[category.name] || '📱'}
                  </span>
                </div>
                <span className={cn(
                  "text-xs",
                  index === 0 ? "font-medium" : "text-muted-foreground"
                )}
                style={index === 0 ? { color: '#ff3366' } : undefined}>
                  {category.name}
                </span>
              </Button>
            ))}
          </div>
        </section>

        {/* Popular Nearby Benefits */}
        <section className="py-4">
          <div className="px-4 flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">내 근처 인기 혜택</h3>
            <Button 
              variant="link" 
              size="sm"
              onClick={() => window.location.href = '/discover?sort=popularity'}
              className="text-sm text-primary font-medium p-0"
              data-testid="button-view-all-nearby"
            >
              전체보기
            </Button>
          </div>
          
          <div className="overflow-x-auto px-4 pb-2 scrollbar-hide">
            <div className="flex gap-3">
              {popularLoading ? (
                // Skeleton loading
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex-shrink-0 w-64">
                    <div className="skeleton h-36 rounded-xl mb-3" />
                    <div className="skeleton h-4 w-16 rounded mb-2" />
                    <div className="skeleton h-4 w-full rounded mb-2" />
                    <div className="skeleton h-3 w-32 rounded" />
                  </div>
                ))
              ) : nearbyBenefits.length > 0 ? (
                nearbyBenefits.map((benefit: Benefit) => (
                  <div key={benefit.id} className="flex-shrink-0 w-64">
                    <BenefitCard
                      benefit={benefit}
                      variant="vertical"
                      onClick={() => handleBenefitClick(benefit)}
                      className="h-full"
                    />
                  </div>
                ))
              ) : (
                <div className="flex-shrink-0 w-64 text-center py-8">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-sm text-muted-foreground">근처 혜택이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* New Benefits */}
        <section className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">신규 혜택</h3>
            <Button 
              variant="link" 
              size="sm"
              onClick={() => window.location.href = '/discover?sort=newest'}
              className="text-sm text-primary font-medium p-0"
              data-testid="button-view-all-new"
            >
              전체보기
            </Button>
          </div>
          
          <div className="space-y-3">
            {newItems.length > 0 ? (
              newItems.slice(0, 3).map((benefit: Benefit) => (
                <div key={benefit.id} className="relative">
                  <BenefitCard
                    benefit={benefit}
                    variant="horizontal"
                    onClick={() => handleBenefitClick(benefit)}
                    showMerchant={true}
                  />
                  <Badge className="absolute top-3 right-16 bg-primary/10 text-primary border-primary">
                    NEW
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-4">✨</div>
                <p className="text-sm">신규 혜택이 없습니다</p>
              </div>
            )}
          </div>
        </section>

        {/* Black Friday */}
        <section className="px-4 py-4 pb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">블랙 프라이데이 (블프)</h3>
            <Button 
              variant="link" 
              size="sm"
              onClick={() => window.location.href = '/discover?sort=ending'}
              className="text-sm text-primary font-medium p-0"
              data-testid="button-view-all-ending"
            >
              전체보기
            </Button>
          </div>
          
          <div className="space-y-3">
            {endingItems.length > 0 ? (
              endingItems.slice(0, 3).map((benefit: Benefit) => (
                <BenefitCard
                  key={benefit.id}
                  benefit={benefit}
                  variant="horizontal"
                  onClick={() => handleBenefitClick(benefit)}
                  showMerchant={true}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-4">🛍️</div>
                <p className="text-sm">블랙 프라이데이 혜택이 없습니다</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomNavigation />

      {/* Modals */}
      <BenefitModal
        benefit={selectedBenefit}
        merchant={selectedBenefit?.merchant}
        isOpen={isBenefitModalOpen}
        onClose={() => setIsBenefitModalOpen(false)}
      />
    </div>
  );
}
