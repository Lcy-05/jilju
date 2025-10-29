import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import useEmblaCarousel from 'embla-carousel-react';
import { Link } from 'wouter';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { BenefitCard } from '@/components/benefit/benefit-card';
import { BenefitModal } from '@/components/benefit/benefit-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useLocation } from '@/hooks/use-location';
import { useAuth } from '@/lib/auth';
import { Benefit, Category } from '@/types';
import { API_ENDPOINTS, CATEGORY_ICONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [selectedBannerIndex, setSelectedBannerIndex] = useState(0);
  const [selectedPoster, setSelectedPoster] = useState<any>(null);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [bookmarkedBenefits, setBookmarkedBenefits] = useState<Set<string>>(new Set());
  const { location } = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Initialize Embla Carousel for banners
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: true });
  
  // Initialize Embla Carousel for partnership posters
  const [partnersEmblaRef] = useEmblaCarousel({ 
    loop: false, 
    dragFree: true,
    align: 'start',
    containScroll: 'trimSnaps',
    slidesToScroll: 1
  });

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

  // Get partnership posters
  const { data: partnershipPostersData } = useQuery({
    queryKey: ['/api/partnership-posters'],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Get user bookmarks
  const { data: bookmarksData } = useQuery<{ bookmarks: Benefit[] }>({
    queryKey: [`/api/users/${user?.id}/bookmarks`],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update bookmarked benefits set when data changes
  useEffect(() => {
    if (bookmarksData?.bookmarks) {
      setBookmarkedBenefits(new Set(bookmarksData.bookmarks.map((b: Benefit) => b.id)));
    }
  }, [bookmarksData]);

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async ({ benefitId, isBookmarked }: { benefitId: string; isBookmarked: boolean }) => {
      if (isBookmarked) {
        return apiRequest('DELETE', `/api/bookmarks/${benefitId}`);
      } else {
        return apiRequest('POST', '/api/bookmarks', { benefitId });
      }
    },
    onMutate: async ({ benefitId, isBookmarked }) => {
      // Optimistic update
      setBookmarkedBenefits(prev => {
        const newSet = new Set(prev);
        if (isBookmarked) {
          newSet.delete(benefitId);
        } else {
          newSet.add(benefitId);
        }
        return newSet;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/bookmarks`] });
    },
    onError: (error, { benefitId, isBookmarked }) => {
      // Revert on error
      setBookmarkedBenefits(prev => {
        const newSet = new Set(prev);
        if (isBookmarked) {
          newSet.add(benefitId);
        } else {
          newSet.delete(benefitId);
        }
        return newSet;
      });
      toast({
        title: '오류',
        description: '북마크 저장에 실패했습니다.',
        variant: 'destructive'
      });
    }
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

  const handleBookmark = (benefitId: string) => {
    if (!user) {
      toast({
        title: '로그인 필요',
        description: '북마크 기능을 사용하려면 로그인해주세요.',
        variant: 'default'
      });
      window.location.href = '/auth';
      return;
    }
    
    const isBookmarked = bookmarkedBenefits.has(benefitId);
    bookmarkMutation.mutate({ benefitId, isBookmarked });
  };

  const handleCategoryClick = (category: Category) => {
    // Navigate to discover page with category filter
    window.location.href = `/discover?categories=${category.id}`;
  };

  // Category display order
  const categoryOrder = ['음식', '카페/바', '뷰티/패션', '문화생활', '스포츠'];
  const allCategories = (categories as any)?.categories || [];
  const displayCategories = categoryOrder
    .map(name => allCategories.find((cat: Category) => cat.name === name))
    .filter(Boolean)
    .slice(0, 5);
  
  const nearbyBenefits = (popularBenefits as any)?.benefits || [];
  const endingItems = (endingSoonBenefits as any)?.benefits || [];
  const banners = (bannersData as any)?.banners || [];
  const partnershipPosters = (partnershipPostersData as any)?.posters || [];

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

  const handlePosterClick = (poster: any) => {
    setSelectedPoster(poster);
    setIsPosterModalOpen(true);
  };

  const handlePosterViewBenefits = () => {
    if (selectedPoster?.linkUrl) {
      window.location.href = selectedPoster.linkUrl;
    }
    setIsPosterModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="animate-fade-in pt-4">
        {/* Banner Carousel */}
        <section className="px-4 pt-4">
          {banners.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl" ref={emblaRef}>
                <div className="flex">
                  {banners.map((banner: any, index: number) => (
                    <div 
                      key={banner.id} 
                      className="flex-[0_0_100%] min-w-0 cursor-pointer"
                      onClick={() => handleBannerClick(banner)}
                      data-testid={`banner-item-${index}`}
                    >
                      <img 
                        src={banner.imageUrl} 
                        alt={banner.title} 
                        className="w-full h-40 object-cover" 
                      />
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
                    aria-pressed={index === selectedBannerIndex}
                  />
                ))}
              </div>
            </>
          ) : (
            // Fallback banner when no banners in database
            <div className="overflow-hidden rounded-xl">
              <img 
                src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400" 
                alt="질주 배너" 
                className="w-full h-40 object-cover" 
              />
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

        {/* Partnership Posters (대형 제휴) */}
        <section className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">대형 제휴</h3>
          </div>
          
          {partnershipPosters.length > 0 ? (
            <div className="overflow-hidden -mx-4">
              <div className="embla-partners" ref={partnersEmblaRef}>
                <div className="embla__container-partners flex gap-4 pl-4 pr-4">
                  {partnershipPosters.map((poster: any) => (
                    <div
                      key={poster.id}
                      onClick={() => handlePosterClick(poster)}
                      className="embla__slide-partners flex-shrink-0 w-[55%] min-w-[280px] cursor-pointer"
                      data-testid={`partnership-poster-${poster.id}`}
                    >
                      <img
                        src={poster.imageUrl}
                        alt={poster.title}
                        className="w-full aspect-square object-contain rounded-xl shadow-lg pointer-events-none"
                        draggable="false"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">🤝</div>
              <p className="text-sm">제휴 포스터가 없습니다</p>
            </div>
          )}
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
                  onBookmark={() => handleBookmark(benefit.id)}
                  isBookmarked={bookmarkedBenefits.has(benefit.id)}
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

      {/* Partnership Poster Modal */}
      <Dialog open={isPosterModalOpen} onOpenChange={setIsPosterModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">{selectedPoster?.title || '대형 제휴 포스터'}</DialogTitle>
          <button
            onClick={() => setIsPosterModalOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            data-testid="button-close-poster-modal"
          >
            <X className="w-6 h-6" />
          </button>
          {selectedPoster && (
            <div className="relative flex flex-col items-center">
              <img
                src={selectedPoster.imageUrl}
                alt={selectedPoster.title}
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
