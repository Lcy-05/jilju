import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation as useRouterLocation } from 'wouter';
import { Header } from '@/components/layout/header';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { BenefitCard } from '@/components/benefit/benefit-card';
import { BenefitModal } from '@/components/benefit/benefit-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Filter, ChevronDown } from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { useAuth } from '@/lib/auth';
import { Benefit, SearchOptions, Category, Region } from '@/types';
import { API_ENDPOINTS, SORT_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Discover() {
  const [, setLocation] = useRouterLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [isRegionFilterOpen, setIsRegionFilterOpen] = useState(false);
  const [bookmarkedBenefits, setBookmarkedBenefits] = useState<Set<string>>(new Set());
  const [displayedCount, setDisplayedCount] = useState(20); // 처음에 20개만 표시
  
  // Search and filter state
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    categoryId: undefined,
    types: [],
    sort: 'distance',
    nowOpen: false
  });
  
  // Track if component has mounted to skip initial URL update
  const hasMounted = useRef(false);
  
  const { location } = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Parse URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const params: SearchOptions = {
      categoryId: urlParams.get('cat') || undefined,  // 단일 카테고리
      types: urlParams.getAll('types'),
      sort: (urlParams.get('sort') as any) || 'distance',
      nowOpen: urlParams.get('nowOpen') === 'true',
      regionId: urlParams.get('regionId') || undefined
    };
    setSearchOptions(params);
    setSearchQuery(urlParams.get('q') || '');
  }, []);

  // Update URL when search options change (skip initial mount)
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    updateURL();
  }, [searchOptions, searchQuery]);

  // Reset displayed count when search options change
  useEffect(() => {
    setDisplayedCount(20);
  }, [searchOptions, searchQuery]);

  // Get categories for filtering
  const { data: categories } = useQuery({
    queryKey: [API_ENDPOINTS.CATEGORIES],
    staleTime: 30 * 60 * 1000,
  });

  // Get regions for filtering
  const { data: regions } = useQuery({
    queryKey: [`${API_ENDPOINTS.GEOGRAPHY.REGIONS}?level=3`], // Level 3 (동/읍/면)
    staleTime: 30 * 60 * 1000,
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

  // Search benefits
  const { data: searchResults, isLoading } = useQuery({
    queryKey: [
      API_ENDPOINTS.BENEFITS.SEARCH,
      searchQuery,
      searchOptions.categoryId,  // 단일 카테고리
      JSON.stringify(searchOptions.types),
      searchOptions.regionId,
      searchOptions.sort,
      searchOptions.nowOpen,
      location?.lat,
      location?.lng
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.set('q', searchQuery);
      }
      
      // Always provide bbox or lat/lng so category filters work
      if (location?.lat && location?.lng) {
        // Wide bbox to cover entire island (±0.3 degrees ≈ 33km radius)
        params.set('bbox', `${location.lat-0.3},${location.lng-0.3},${location.lat+0.3},${location.lng+0.3}`);
      } else {
        // Default to Jeju Island coordinates - wide bbox to cover entire island
        const defaultLat = 33.4996;
        const defaultLng = 126.5312;
        // Wider range to include all of Jeju (±0.3 degrees ≈ 33km radius)
        params.set('bbox', `${defaultLat-0.3},${defaultLng-0.3},${defaultLat+0.3},${defaultLng+0.3}`);
      }

      if (searchOptions.categoryId) params.append('cats', searchOptions.categoryId);  // 단일 카테고리
      searchOptions.types?.forEach(type => params.append('types', type));
      
      if (searchOptions.regionId) params.set('regionId', searchOptions.regionId);
      if (searchOptions.sort) params.set('sort', searchOptions.sort);
      if (searchOptions.nowOpen) params.set('nowOpen', 'true');
      
      params.set('limit', '2000');

      const response = await fetch(`${API_ENDPOINTS.BENEFITS.SEARCH}?${params}`);
      return response.json();
    },
    staleTime: 0, // No caching to ensure filters work immediately
  });

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    // URL will be updated by useEffect
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (searchOptions.sort) params.set('sort', searchOptions.sort);
    if (searchOptions.nowOpen) params.set('nowOpen', 'true');
    if (searchOptions.regionId) params.set('regionId', searchOptions.regionId);
    if (searchOptions.categoryId) params.set('cat', searchOptions.categoryId);  // 단일 카테고리
    searchOptions.types?.forEach(type => params.append('types', type));
    
    const newUrl = `/discover${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleCategoryFilter = (categoryId: string) => {
    setSearchOptions(prev => {
      if (prev.categoryId === categoryId) {
        // 토글 해제 - categoryId 제거하고 새 객체 생성
        const { categoryId: _, ...rest } = prev;
        return { ...rest };
      } else {
        // 새 카테고리 선택
        return { ...prev, categoryId };
      }
    });
  };

  const handleTypeFilter = (type: string, checked: boolean) => {
    setSearchOptions(prev => ({
      ...prev,
      types: checked 
        ? prev.types?.includes(type)
          ? prev.types  // 이미 있으면 그대로
          : [...(prev.types || []), type]  // 없으면 추가
        : (prev.types || []).filter(t => t !== type)
    }));
  };

  const handleSortChange = (sort: string) => {
    setSearchOptions(prev => ({ ...prev, sort: sort as any }));
  };

  const handleBenefitClick = async (benefit: Benefit) => {
    // Record view (fire and forget - don't wait for response)
    if (user) {
      apiRequest('POST', '/api/views', {
        resourceId: benefit.id,
        resourceType: 'BENEFIT'
      }).catch(err => {
        console.error('Failed to record view:', err);
      });
    }
    
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

  const benefits = searchResults?.benefits || [];
  const totalCount = searchResults?.total || 0;

  // Use dynamic categories from API with specific order (exclude "기타")
  const categoryOrder = ['음식', '카페/바', '뷰티/패션', '문화생활', '스포츠'];
  const allCategories = (categories as any)?.categories || [];
  const displayCategories = categoryOrder
    .map(name => allCategories.find((cat: Category) => cat.name === name))
    .filter(Boolean)
    .filter((cat: Category) => cat.name !== '기타'); // Exclude "기타" category
    
  // Get selected region name for header display
  const selectedRegionName = searchOptions.regionId 
    ? (regions as any)?.regions?.find((r: Region) => r.id === searchOptions.regionId)?.name 
    : '전체';
    
  const benefitTypes = [
    { value: 'PERCENT', label: '할인율' },
    { value: 'AMOUNT', label: '정액할인' },
    { value: 'GIFT', label: '증정' },
    { value: 'MEMBERSHIP', label: '멤버십' }
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* 통합 헤더 블록 - sticky 컨테이너 */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-md shadow-none border-b border-white/10 pt-4 pb-4">
        <Header
          onSearchSubmit={handleSearchSubmit}
          onSearchChange={setSearchQuery}
          onLocationClick={() => setIsRegionFilterOpen(true)}
          className="shadow-none border-b-0 !pb-0 !pt-0 !bg-transparent"
          selectedRegionName={selectedRegionName}
        />
        
        {/* Filter Bar - 헤더와 맞닿은 블록 */}
        <section className="px-4 pt-3 pb-0">
        {/* Category Filters with Filter Button */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-2">
          {displayCategories.map((category: Category) => {
            const isSelected = searchOptions.categoryId === category.id;  // 단일 선택
            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "secondary"}
                size="sm"
                onClick={() => handleCategoryFilter(category.id)}  // 토글 방식
                className="flex-shrink-0 rounded-full"
                data-testid={`button-category-${category.name}`}
              >
                {category.name}
              </Button>
            );
          })}
          
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="secondary" 
                size="sm"
                className="flex-shrink-0 rounded-full"
                data-testid="button-open-filters"
              >
                <Filter className="w-4 h-4 mr-1" />
                필터
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>상세 필터</SheetTitle>
              </SheetHeader>
              
              <div className="py-4 space-y-6">
                {/* Benefit Types */}
                <div>
                  <h4 className="font-semibold mb-3">혜택 종류</h4>
                  <div className="space-y-2">
                    {benefitTypes.map(({ value, label }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${value}`}
                          checked={searchOptions.types?.includes(value)}
                          onCheckedChange={(checked) => handleTypeFilter(value, !!checked)}
                        />
                        <label htmlFor={`type-${value}`} className="text-sm">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Now Open */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="now-open"
                    checked={searchOptions.nowOpen}
                    onCheckedChange={(checked) => 
                      setSearchOptions(prev => ({ ...prev, nowOpen: !!checked }))
                    }
                  />
                  <label htmlFor="now-open" className="text-sm">
                    지금 사용 가능
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      setIsFilterOpen(false);
                      // URL will be updated by useEffect
                    }}
                  >
                    필터 적용
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchOptions({ sort: 'distance' })}
                  >
                    초기화
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Sheet open={isSortSheetOpen} onOpenChange={setIsSortSheetOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1"
                data-testid="button-sort"
              >
                <span>{SORT_OPTIONS.find(opt => opt.value === searchOptions.sort)?.label || '거리순'}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto pb-24">
              <div className="py-4">
                <h4 className="font-semibold mb-3">정렬</h4>
                <div className="space-y-2 pb-4">
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <Button
                      key={value}
                      variant={searchOptions.sort === value ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        handleSortChange(value);
                        setIsSortSheetOpen(false);
                      }}
                      data-testid={`button-sort-${value}`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 text-sm text-white/90">
            <Checkbox
              id="now-open-quick"
              checked={searchOptions.nowOpen}
              onCheckedChange={(checked) => {
                setSearchOptions(prev => ({ ...prev, nowOpen: !!checked }));
                // URL will be updated by useEffect
              }}
            />
            <label htmlFor="now-open-quick" className="text-white/90">지금 사용 가능</label>
          </div>
        </div>
      </section>
      </div>

      {/* Results */}
      <section className="px-4 pt-6 pb-4">
        <div className="text-base font-medium text-white mb-4" data-testid="text-results-count">
          총 {totalCount.toLocaleString()}개의 혜택
        </div>
        
        <div className="space-y-3">
          {isLoading ? (
            // Skeleton loading
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="bg-card rounded-xl p-3 shadow-sm">
                <div className="flex gap-3">
                  <div className="skeleton w-24 h-24 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-16 rounded" />
                    <div className="skeleton h-4 w-full rounded" />
                    <div className="skeleton h-3 w-32 rounded" />
                  </div>
                </div>
              </div>
            ))
          ) : benefits.length > 0 ? (
            benefits.slice(0, displayedCount).map((benefit: Benefit) => (
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
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2 text-white">검색 결과가 없습니다</h3>
              <p className="text-sm text-white/60 mb-4">
                다른 키워드나 필터로 다시 시도해보세요
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setSearchOptions({ sort: 'distance' });
                  // URL will be updated by useEffect
                }}
              >
                검색 초기화
              </Button>
            </div>
          )}
        </div>

        {/* Load More */}
        {benefits.length > displayedCount && (
          <div className="text-center py-6">
            <Button 
              variant="outline"
              onClick={() => {
                setDisplayedCount(prev => prev + 20);
              }}
              data-testid="button-load-more"
            >
              더보기 ({benefits.length - displayedCount}개 남음)
            </Button>
          </div>
        )}
      </section>

      <BottomNavigation />

      {/* Modals */}
      <BenefitModal
        benefit={selectedBenefit}
        merchant={selectedBenefit?.merchant}
        isOpen={isBenefitModalOpen}
        onClose={() => setIsBenefitModalOpen(false)}
      />

      {/* Region Filter Sheet */}
      <Sheet open={isRegionFilterOpen} onOpenChange={setIsRegionFilterOpen}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>지역 선택</SheetTitle>
          </SheetHeader>
          
          <div className="py-4 space-y-2 overflow-y-auto max-h-[60vh]">
            {/* Clear button */}
            <Button
              variant={!searchOptions.regionId ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                setSearchOptions(prev => {
                  const { regionId, ...rest } = prev;
                  return { ...rest };
                });
                setIsRegionFilterOpen(false);
              }}
              data-testid="button-region-all"
            >
              전체 지역
            </Button>
            
            {/* Region list with loading state */}
            {!regions ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">로딩중...</p>
              </div>
            ) : (regions as any)?.regions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">지역 정보가 없습니다</p>
              </div>
            ) : (
              (regions as any)?.regions?.map((region: Region) => (
                <Button
                  key={region.id}
                  variant={searchOptions.regionId === region.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchOptions(prev => ({ ...prev, regionId: region.id }));
                    setIsRegionFilterOpen(false);
                  }}
                  data-testid={`button-region-${region.name}`}
                >
                  {region.name}
                </Button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
