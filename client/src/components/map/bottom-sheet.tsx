import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BenefitCard } from '@/components/benefit/benefit-card';
import { Benefit } from '@/types';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  benefits: (Benefit & { merchant?: { name: string; address: string } })[];
  onBenefitClick?: (benefit: Benefit) => void;
  onViewList?: () => void;
  className?: string;
}

type SheetState = 'collapsed' | 'mid' | 'expanded';

export function BottomSheet({ benefits, onBenefitClick, onViewList, className }: BottomSheetProps) {
  const [state, setState] = useState<SheetState>('collapsed');
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const getTransform = () => {
    switch (state) {
      case 'collapsed':
        return 'translateY(calc(100% - 120px))';
      case 'mid':
        return 'translateY(50%)';
      case 'expanded':
        return 'translateY(0)';
      default:
        return 'translateY(calc(100% - 120px))';
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const diff = startY - currentY;
    
    if (Math.abs(diff) < 10) {
      // Tap gesture - expand if collapsed
      if (state === 'collapsed') {
        setState('mid');
      }
      return;
    }

    // Swipe gestures
    if (diff > 50) {
      // Swipe up
      if (state === 'collapsed') {
        setState('mid');
      } else if (state === 'mid') {
        setState('expanded');
      }
    } else if (diff < -50) {
      // Swipe down
      if (state === 'expanded') {
        setState('mid');
      } else if (state === 'mid') {
        setState('collapsed');
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setCurrentY(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    setCurrentY(e.clientY);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const diff = startY - currentY;
    
    if (Math.abs(diff) < 10) {
      // Click gesture
      if (state === 'collapsed') {
        setState('mid');
      }
      return;
    }

    // Drag gestures
    if (diff > 50) {
      // Drag up
      if (state === 'collapsed') {
        setState('mid');
      } else if (state === 'mid') {
        setState('expanded');
      }
    } else if (diff < -50) {
      // Drag down
      if (state === 'expanded') {
        setState('mid');
      } else if (state === 'mid') {
        setState('collapsed');
      }
    }
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
  }, [isDragging]);

  return (
    <div
      ref={sheetRef}
      className={cn(
        "bottom-sheet",
        className
      )}
      style={{
        transform: getTransform(),
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      }}
      data-testid="bottom-sheet"
    >
      {/* Handle */}
      <div 
        className="flex justify-center py-2 cursor-pointer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        data-testid="bottom-sheet-handle"
      >
        <div className="w-12 h-1 bg-muted rounded-full" />
      </div>

      {/* Content */}
      <div className="px-4 pb-safe overflow-y-auto max-h-[70vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" data-testid="text-benefits-count">
            이 지역 혜택 <span className="text-primary">{benefits.length}</span>
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

        {/* Benefits List */}
        {benefits.length > 0 ? (
          <div className="space-y-3 pb-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.id}
                className="bg-background rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow"
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
                        <span className="badge-percent px-2 py-0.5 text-xs font-medium rounded-full">
                          {benefit.percent}%
                        </span>
                      )}
                      {benefit.type === 'AMOUNT' && (
                        <span className="badge-amount px-2 py-0.5 text-xs font-medium rounded-full">
                          {benefit.amount?.toLocaleString()}원
                        </span>
                      )}
                      {benefit.type === 'GIFT' && (
                        <span className="badge-gift px-2 py-0.5 text-xs font-medium rounded-full">
                          증정
                        </span>
                      )}
                      {benefit.type === 'MEMBERSHIP' && (
                        <span className="badge-membership px-2 py-0.5 text-xs font-medium rounded-full">
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
                      <span className="text-primary">영업중</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-sm">이 지역에는 혜택이 없습니다</p>
            <p className="text-xs mt-1">다른 지역을 확인해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
