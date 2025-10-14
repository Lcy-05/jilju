import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { BenefitCard } from '@/components/benefit/benefit-card';
import { Benefit, Category } from '@/types';
import { cn } from '@/lib/utils';

export type SheetState = 'collapsed' | 'half' | 'expanded';

interface BottomSheetProps {
  benefits: (Benefit & { merchant?: { name: string; address: string } })[];
  totalCount?: number;
  categories?: Category[];
  selectedCategories?: string[];
  onCategoryToggle?: (categoryId: string) => void;
  onBenefitClick?: (benefit: Benefit) => void;
  onViewList?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onSheetStateChange?: (state: SheetState) => void;
  className?: string;
}

const MIN_HEIGHT = 150; // px - increased to prevent header content from being covered by bottom nav
const MAX_HEIGHT_PERCENT = 85; // % of viewport
const LOAD_MORE_THRESHOLD = 200; // px from bottom

export function BottomSheet({ 
  benefits, 
  totalCount,
  categories = [],
  selectedCategories = [],
  onCategoryToggle,
  onBenefitClick, 
  onViewList, 
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onSheetStateChange,
  className 
}: BottomSheetProps) {
  const [sheetHeight, setSheetHeight] = useState(MIN_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isScrollAtTop, setIsScrollAtTop] = useState(true);

  const maxHeight = typeof window !== 'undefined' ? window.innerHeight * (MAX_HEIGHT_PERCENT / 100) : 600;

  // Calculate sheet state based on height
  const getSheetState = (height: number): SheetState => {
    const halfThreshold = maxHeight * 0.4;
    const expandedThreshold = maxHeight * 0.6;
    
    if (height <= halfThreshold) {
      return 'collapsed';
    } else if (height < expandedThreshold) {
      return 'half';
    } else {
      return 'expanded';
    }
  };

  // Notify parent when sheet state changes
  useEffect(() => {
    if (onSheetStateChange) {
      const state = getSheetState(sheetHeight);
      onSheetStateChange(state);
    }
  }, [sheetHeight, maxHeight, onSheetStateChange]);

  const handleScroll = () => {
    if (contentRef.current) {
      setIsScrollAtTop(contentRef.current.scrollTop === 0);
      
      // Infinite scroll: load more when near bottom
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      
      if (distanceFromBottom < LOAD_MORE_THRESHOLD && hasMore && !isLoading && onLoadMore) {
        onLoadMore();
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Always allow dragging from handle
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartHeight(sheetHeight);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = startY - currentY;
    const newHeight = Math.min(Math.max(startHeight + diff, MIN_HEIGHT), maxHeight);
    
    setSheetHeight(newHeight);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Always allow dragging from handle
    setIsDragging(true);
    setStartY(e.clientY);
    setStartHeight(sheetHeight);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const diff = startY - e.clientY;
    const newHeight = Math.min(Math.max(startHeight + diff, MIN_HEIGHT), maxHeight);
    
    setSheetHeight(newHeight);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseMoveGlobal = (e: MouseEvent) => handleMouseMove(e);
      const handleMouseUpGlobal = () => handleMouseUp();
      
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('mouseup', handleMouseUpGlobal);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveGlobal);
        document.removeEventListener('mouseup', handleMouseUpGlobal);
      };
    }
  }, [isDragging, startY, startHeight]);

  return (
    <div
      ref={sheetRef}
      className={cn(
        "fixed left-0 right-0 max-w-md mx-auto bg-background rounded-t-3xl shadow-2xl",
        "z-[20]",
        className
      )}
      style={{
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
        height: `${sheetHeight}px`,
        transition: isDragging ? 'none' : 'height 0.2s ease-out'
      }}
      data-testid="bottom-sheet"
    >
      {/* Handle */}
      <div 
        className="flex justify-center py-2 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        data-testid="bottom-sheet-handle"
      >
        <div className="w-9 h-1 rounded-full" style={{ backgroundColor: '#D9D9D9' }} />
      </div>

      {/* Content */}
      <div 
        ref={contentRef}
        className="px-4 pb-4 overflow-y-auto"
        style={{ height: `calc(${sheetHeight}px - 48px)` }}
        onScroll={handleScroll}
      >
        {/* Header with count and view list button */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold" data-testid="text-benefits-count">
            총 <span className="text-primary">{totalCount ?? benefits.length}</span>개의 혜택
          </h3>
          {onViewList && (
            <Button 
              variant="link" 
              size="sm" 
              onClick={onViewList}
              className="text-sm text-primary font-medium p-0"
              data-testid="button-view-list"
            >
              목록보기
            </Button>
          )}
        </div>

        {/* Category Chips - Layout changes based on sheet state */}
        {categories.length > 0 && (
          <div 
            className={cn(
              "mb-4",
              getSheetState(sheetHeight) === 'collapsed' 
                ? "overflow-x-auto scrollbar-hide" 
                : ""
            )}
          >
            <div 
              className={cn(
                "flex gap-2",
                getSheetState(sheetHeight) === 'collapsed' 
                  ? "flex-nowrap" 
                  : "flex-wrap"
              )}
            >
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategories.includes(category.id) ? "default" : "secondary"}
                  size="sm"
                  onClick={() => onCategoryToggle?.(category.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap flex-shrink-0 min-h-[44px]",
                    selectedCategories.includes(category.id) 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-secondary"
                  )}
                  data-testid={`button-category-${category.name}`}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Benefits List */}
        {isLoading && benefits.length === 0 ? (
          <div className="space-y-3 pb-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3">
                <div className="flex gap-3">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : benefits.length > 0 ? (
          <div className="space-y-3 pb-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.id}
                className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onBenefitClick?.(benefit)}
                data-testid={`card-map-benefit-${benefit.id}`}
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                    <span className="text-2xl">🎁</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {benefit.type === 'PERCENT' && (
                        <span className="bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium rounded-full">
                          {benefit.percent}%
                        </span>
                      )}
                      {benefit.type === 'AMOUNT' && (
                        <span className="bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium rounded-full">
                          {benefit.amount?.toLocaleString()}원
                        </span>
                      )}
                      {benefit.type === 'GIFT' && (
                        <span className="bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium rounded-full">
                          증정
                        </span>
                      )}
                      {benefit.type === 'MEMBERSHIP' && (
                        <span className="bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium rounded-full">
                          멤버십
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm line-clamp-1" data-testid="text-benefit-title">
                      {benefit.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-benefit-merchant">
                      {benefit.merchant?.name}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{benefit.distanceFormatted || '거리 정보 없음'}</span>
                      <span>•</span>
                      <span style={{ color: '#00B14F' }}>영업중</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state">
            <div className="w-24 h-24 mb-6 flex items-center justify-center">
              <svg className="w-full h-full text-primary/40" viewBox="0 0 100 100" fill="none">
                <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="6"/>
                <path d="M60 60 L80 80" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold mb-2">이 지역에 등록된 혜택이 없습니다</h3>
            <p className="text-sm text-muted-foreground mb-6">다른 키워드나 필터로 다시 시도해보세요</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-full"
                data-testid="button-expand-radius"
              >
                범위 넓히기(+2km)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-full"
                data-testid="button-reset-filter"
              >
                필터 초기화
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="rounded-full"
                data-testid="button-view-categories"
              >
                카테고리 보기
              </Button>
            </div>
          </div>
        )}

        {/* Loading Skeleton for Infinite Scroll */}
        {isLoading && benefits.length > 0 && (
          <div className="space-y-3 pb-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3">
                <div className="flex gap-3">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
