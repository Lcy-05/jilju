import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Bookmark, ExternalLink, Navigation } from 'lucide-react';
import { Benefit } from '@/types';
import { cn } from '@/lib/utils';

interface BenefitCardProps {
  benefit: Benefit & { merchant?: { name: string; address: string } };
  onClick?: () => void;
  onBookmark?: () => void;
  onDirections?: () => void;
  isBookmarked?: boolean;
  showMerchant?: boolean;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

export function BenefitCard({
  benefit,
  onClick,
  onBookmark,
  onDirections,
  isBookmarked = false,
  showMerchant = true,
  variant = 'vertical',
  className
}: BenefitCardProps) {
  const getBenefitBadge = () => {
    switch (benefit.type) {
      case 'PERCENT':
        return (
          <Badge className="badge-percent text-sm font-semibold px-3 py-1">
            {benefit.percent}%
          </Badge>
        );
      case 'AMOUNT':
        return (
          <Badge className="badge-amount text-sm font-semibold px-3 py-1">
            {benefit.amount?.toLocaleString()}원
          </Badge>
        );
      case 'GIFT':
        return (
          <Badge className="badge-gift text-sm font-semibold px-3 py-1">
            증정
          </Badge>
        );
      case 'MEMBERSHIP':
        return (
          <Badge className="badge-membership text-sm font-semibold px-3 py-1">
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
        className={cn("cursor-pointer hover:shadow-md transition-shadow", className)}
        onClick={onClick}
        data-testid={`card-benefit-${benefit.id}`}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Thumbnail would go here - using placeholder div */}
            <div className="w-24 h-24 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
              <span className="text-2xl">🎁</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getBenefitBadge()}
                    {isNowOpen() && (
                      <Badge variant="outline" className="text-primary border-primary text-sm font-medium px-2.5 py-0.5">
                        지금 사용 가능
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm line-clamp-1" data-testid="text-benefit-title">
                    {benefit.title}
                  </h4>
                  {showMerchant && benefit.merchant && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-merchant-name">
                      {benefit.merchant.name}
                    </p>
                  )}
                </div>
                
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
              
              <div className="flex items-center gap-3 mt-2 text-xs">
                {benefit.distanceFormatted && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {benefit.distanceFormatted}
                  </span>
                )}
                
                {expirationStatus && (
                  <Badge variant={expirationStatus.variant} className="text-xs">
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
                    className="text-xs text-primary flex items-center gap-1 p-0 h-auto"
                    data-testid="button-directions"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    길찾기
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vertical layout (default)
  return (
    <Card 
      className={cn("cursor-pointer hover:shadow-md transition-shadow overflow-hidden", className)}
      onClick={onClick}
      data-testid={`card-benefit-${benefit.id}`}
    >
      {/* Image placeholder */}
      <div className="w-full h-36 bg-muted flex items-center justify-center">
        <span className="text-4xl">🎁</span>
      </div>
      
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            {getBenefitBadge()}
            <h4 className="font-semibold text-sm mt-1.5 line-clamp-1" data-testid="text-benefit-title">
              {benefit.title}
            </h4>
          </div>
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
        
        {showMerchant && benefit.merchant && (
          <p className="text-sm text-muted-foreground mb-2" data-testid="text-merchant-name">
            {benefit.merchant.name}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {benefit.distanceFormatted || '거리 정보 없음'}
          </span>
          
          {isNowOpen() ? (
            <Badge variant="outline" className="text-primary border-primary font-medium px-2.5 py-0.5">
              지금 사용 가능
            </Badge>
          ) : expirationStatus ? (
            <span className={cn(
              "font-medium",
              expirationStatus.variant === 'destructive' ? "text-destructive" : "text-muted-foreground"
            )}>
              {expirationStatus.label}
            </span>
          ) : (
            <span className="text-muted-foreground">사용 제한</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
