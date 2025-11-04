import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Bookmark, ExternalLink, Navigation } from 'lucide-react';
import { Benefit } from '@/types';
import { cn } from '@/lib/utils';

interface BenefitCardProps {
  benefit: Benefit & { merchant?: { name: string; address: string; closedDays?: string; description?: string } };
  onClick?: () => void;
  onBookmark?: () => void;
  onDirections?: () => void;
  isBookmarked?: boolean;
  showMerchant?: boolean;
  variant?: 'horizontal' | 'vertical';
  className?: string;
  showNewBadge?: boolean;
}

export function BenefitCard({
  benefit,
  onClick,
  onBookmark,
  onDirections,
  isBookmarked = false,
  showMerchant = true,
  variant = 'vertical',
  className,
  showNewBadge = false
}: BenefitCardProps) {
  const getBenefitBadge = () => {
    switch (benefit.type) {
      case 'PERCENT':
        return (
          <Badge className="badge-percent text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 whitespace-nowrap">
            {benefit.percent}%
          </Badge>
        );
      case 'AMOUNT':
        return (
          <Badge className="badge-amount text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 whitespace-nowrap">
            {benefit.amount?.toLocaleString()}원
          </Badge>
        );
      case 'GIFT':
        return (
          <Badge className="badge-gift text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 whitespace-nowrap">
            증정
          </Badge>
        );
      case 'MEMBERSHIP':
        return (
          <Badge className="badge-membership text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 whitespace-nowrap">
            멤버십
          </Badge>
        );
      default:
        return null;
    }
  };

  const isNowOpen = () => {
    // This would check merchant hours and current time
    // For now, simplified logic
    const now = new Date();
    const hour = now.getHours();
    return hour >= 9 && hour < 22; // Assume 9 AM - 10 PM
  };

  const getExpirationStatus = () => {
    const now = new Date();
    const validTo = new Date(benefit.validTo);
    const timeDiff = validTo.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff <= 0) return { label: '만료됨', variant: 'destructive' as const };
    if (daysDiff <= 3) return { label: `${daysDiff}일 남음`, variant: 'destructive' as const };
    if (daysDiff <= 7) return { label: `${daysDiff}일 남음`, variant: 'secondary' as const };
    return null;
  };

  const expirationStatus = getExpirationStatus();

  if (variant === 'horizontal') {
    return (
      <Card 
        className={cn("cursor-pointer hover:shadow-md transition-shadow h-auto", className)}
        onClick={onClick}
        data-testid={`card-benefit-${benefit.id}`}
      >
        <CardContent className="p-3">
          {/* Flex 구조: 이미지 | 컨텐츠 | 북마크 */}
          <div className="flex gap-3 items-start">
            {/* Thumbnail Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-black shrink-0">
              {benefit.images && benefit.images.length > 0 ? (
                <img 
                  src={benefit.images[0]} 
                  alt={benefit.title}
                  className="w-full h-full object-cover"
                />
              ) : benefit.merchant?.images && benefit.merchant.images.length > 0 ? (
                <img 
                  src={benefit.merchant.images[0]} 
                  alt={benefit.merchant.name}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            
            {/* Content - 우측 북마크 영역 예약됨 */}
            <div className="flex-1 min-w-0">
              {/* 배지들 - 겹침 방지 */}
              <div className="flex items-start gap-1 md:gap-1.5 mb-1.5 flex-wrap">
                {getBenefitBadge()}
                {showNewBadge && (
                  <Badge className="bg-red-500 text-white text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                    NEW
                  </Badge>
                )}
                {isNowOpen() && (
                  <Badge className="bg-pink-500 text-white text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                    바로 사용
                  </Badge>
                )}
              </div>
              
              {/* 제목 */}
              <h4 className="font-semibold text-sm line-clamp-1 mb-1" data-testid="text-benefit-title">
                {benefit.title}
              </h4>
              
              {/* 상점명 */}
              {showMerchant && benefit.merchant && (
                <p className="text-sm md:text-base font-light text-foreground mb-2" data-testid="text-merchant-name">
                  {benefit.merchant.name}
                </p>
              )}
              
              {/* 하단 정보 */}
              <div className="flex items-center gap-3 text-xs flex-wrap">
                {benefit.distanceFormatted && (
                  <span className="text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                    <MapPin className="w-3.5 h-3.5" />
                    {benefit.distanceFormatted}
                  </span>
                )}
                
                {expirationStatus && (
                  <Badge variant={expirationStatus.variant} className="text-xs whitespace-nowrap">
                    <Clock className="w-3 h-3 mr-1" />
                    {expirationStatus.label}
                  </Badge>
                )}
                
                {onDirections && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDirections();
                    }}
                    className="text-xs text-primary flex items-center gap-1 p-0 h-auto whitespace-nowrap"
                    data-testid="button-directions"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    길찾기
                  </Button>
                )}
              </div>
            </div>
            
            {/* 북마크 버튼 - 우측 고정 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onBookmark?.();
              }}
              className="p-1 h-auto shrink-0"
              data-testid="button-bookmark"
            >
              <Bookmark 
                className={cn(
                  "w-5 h-5",
                  isBookmarked ? "fill-primary text-primary" : "text-muted-foreground"
                )}
              />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vertical layout (default)
  return (
    <Card 
      className={cn("cursor-pointer hover:shadow-md transition-shadow overflow-hidden h-auto", className)}
      onClick={onClick}
      data-testid={`card-benefit-${benefit.id}`}
    >
      {/* Image - aspect ratio */}
      <div className="w-full aspect-video bg-black flex items-center justify-center overflow-hidden relative">
        {benefit.images && benefit.images.length > 0 ? (
          <img 
            src={benefit.images[0]} 
            alt={benefit.title}
            className="w-full h-full object-cover"
          />
        ) : benefit.merchant?.images && benefit.merchant.images.length > 0 ? (
          <img 
            src={benefit.merchant.images[0]} 
            alt={benefit.merchant.name}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>
      
      <CardContent className="p-3">
        {/* Grid 2열 구조: 컨텐츠 | 북마크 */}
        <div className="grid grid-cols-[1fr_auto] gap-2 items-start mb-2">
          <div className="min-w-0 flex-1">
            {/* 배지들 - 겹침 방지 */}
            <div className="flex items-start gap-1 md:gap-1.5 mb-1.5 flex-wrap max-w-[calc(100%-2rem)]">
              {getBenefitBadge()}
              {showNewBadge && (
                <Badge className="bg-red-500 text-white text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                  NEW
                </Badge>
              )}
            </div>
            
            {/* 제목 */}
            <h4 className="font-semibold text-sm line-clamp-1" data-testid="text-benefit-title">
              {benefit.title}
            </h4>
          </div>
          
          {/* 북마크 버튼 - 우측 고정 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onBookmark?.();
            }}
            className="p-1 h-auto"
            data-testid="button-bookmark"
          >
            <Bookmark 
              className={cn(
                "w-5 h-5",
                isBookmarked ? "fill-primary text-primary" : "text-muted-foreground"
              )}
            />
          </Button>
        </div>
        
        {/* 상점명 */}
        {showMerchant && benefit.merchant && (
          <p className="text-sm md:text-base font-light text-foreground mb-2" data-testid="text-merchant-name">
            {benefit.merchant.name}
          </p>
        )}
        
        {/* 하단 정보 */}
        <div className="flex items-center justify-between text-xs md:text-sm gap-2">
          <span className="text-muted-foreground whitespace-nowrap">
            {benefit.distanceFormatted || '거리 정보 없음'}
          </span>
          
          {isNowOpen() ? (
            <Badge className="bg-pink-500 text-white font-medium text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 whitespace-nowrap">
              바로 사용
            </Badge>
          ) : expirationStatus ? (
            <span className={cn(
              "font-medium text-[10px] md:text-xs whitespace-nowrap",
              expirationStatus.variant === 'destructive' ? "text-destructive" : "text-muted-foreground"
            )}>
              {expirationStatus.label}
            </span>
          ) : (
            <span className="text-muted-foreground text-[10px] md:text-xs whitespace-nowrap">사용 제한</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
