import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, Clock, Calendar, AlertCircle, Bookmark, Share2, Navigation, Copy } from 'lucide-react';
import { Benefit, Merchant } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { FullscreenMapModal } from '@/components/map/fullscreen-map-modal';

interface BenefitModalProps {
  benefit: Benefit | null;
  merchant?: Merchant;
  isOpen: boolean;
  onClose: () => void;
}

export function BenefitModal({ 
  benefit, 
  merchant, 
  isOpen, 
  onClose
}: BenefitModalProps) {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, token } = useAuth();
  const queryClient = useQueryClient();

  // Fetch bookmark status dynamically
  const { data: bookmarkStatus } = useQuery<{ isBookmarked: boolean }>({
    queryKey: ['/api/bookmarks', benefit?.id, 'status'],
    enabled: isOpen && !!benefit && isAuthenticated,
  });

  const isBookmarked = bookmarkStatus?.isBookmarked ?? false;

  // Log view event when modal opens
  useEffect(() => {
    if (isOpen && benefit && isAuthenticated) {
      // Log click_detail event
      apiRequest('POST', '/api/events', {
        event: 'click_detail',
        benefitId: benefit.id,
        merchantId: merchant?.id,
      }).catch((error) => {
        console.error('Failed to log view event:', error);
      });
    }
  }, [isOpen, benefit, merchant, isAuthenticated]);

  // Parse merchant coordinates safely (must be before early return)
  const merchantCoords = useMemo(() => {
    if (!merchant?.location) return null;
    try {
      const location = typeof merchant.location === 'string' 
        ? JSON.parse(merchant.location) 
        : merchant.location;
      return location;
    } catch (e) {
      console.error('Failed to parse merchant location:', e);
      return null;
    }
  }, [merchant?.location]);

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        const response = await apiRequest('DELETE', `/api/bookmarks/${benefit?.id}`);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/bookmarks', { 
          benefitId: benefit?.id 
        });
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isBookmarked ? '즐겨찾기 제거됨' : '즐겨찾기 추가됨',
        description: isBookmarked ? '즐겨찾기에서 제거되었습니다.' : '즐겨찾기에 추가되었습니다.',
      });
      // Invalidate bookmark status and bookmarks list
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks', benefit?.id, 'status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', 'bookmarks'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: error.message || '처리 중 오류가 발생했습니다.',
      });
    }
  });

  if (!benefit) return null;

  const getBenefitBadge = () => {
    switch (benefit.type) {
      case 'PERCENT':
        return <Badge className="badge-percent">{benefit.percent}% 할인</Badge>;
      case 'AMOUNT':
        return <Badge className="badge-amount">{benefit.amount?.toLocaleString()}원 할인</Badge>;
      case 'GIFT':
        return <Badge className="badge-gift">증정</Badge>;
      case 'MEMBERSHIP':
        return <Badge className="badge-membership">멤버십</Badge>;
      default:
        return null;
    }
  };

  const handleCopyAddress = () => {
    if (merchant?.address) {
      navigator.clipboard.writeText(merchant.address);
      toast({
        title: '주소 복사됨',
        description: '주소가 클립보드에 복사되었습니다.',
      });
    }
  };

  const handleCall = () => {
    if (merchant?.phone) {
      window.location.href = `tel:${merchant.phone}`;
    }
  };

  const handleDirections = () => {
    if (merchantCoords && merchant) {
      window.open(`https://map.naver.com/v5/search/${encodeURIComponent(merchant.name)}/${merchantCoords.lng},${merchantCoords.lat}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: benefit.title,
        text: `${benefit.title} - ${merchant?.name}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: '링크 복사됨',
        description: '혜택 링크가 클립보드에 복사되었습니다.',
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-md mx-auto max-h-[90vh] overflow-y-auto p-0">
        {/* Hero Image */}
        <div className="relative h-56 bg-muted flex items-center justify-center overflow-hidden">
          {benefit.images && benefit.images.length > 0 ? (
            <img 
              src={benefit.images[0]} 
              alt={benefit.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">🎁</span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full w-10 h-10 p-0 bg-white/90 hover:bg-white"
            data-testid="button-close-modal"
          >
            ✕
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* Benefit Info */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                {getBenefitBadge()}
                <DialogHeader className="mt-2 p-0">
                  <DialogTitle className="text-2xl font-bold" data-testid="text-benefit-title">
                    {benefit.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {merchant?.name}에서 제공하는 {benefit.title} 혜택 상세 정보
                  </DialogDescription>
                </DialogHeader>
                {merchant && (
                  <p className="text-base text-foreground/70 mt-2 font-medium" data-testid="text-merchant-name">
                    {merchant.name}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!token) {
                    toast({
                      variant: 'destructive',
                      title: '로그인이 필요합니다',
                      description: '북마크를 추가하려면 로그인하세요.',
                    });
                    return;
                  }
                  bookmarkMutation.mutate();
                }}
                disabled={bookmarkMutation.isPending}
                className="p-2"
                data-testid="button-bookmark-modal"
              >
                <Bookmark 
                  className={cn(
                    "w-7 h-7",
                    isBookmarked ? "fill-primary text-primary" : "text-muted-foreground"
                  )}
                />
              </Button>
            </div>

            {/* Conditions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">사용 가능 시간</span>
                  <p className="text-muted-foreground">매일 09:00 - 22:00</p>
                </div>
              </div>
              
              {benefit.minOrder && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">최소 주문</span>
                    <p className="text-muted-foreground">{benefit.minOrder.toLocaleString()}원 이상</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">유효기간</span>
                  <p className="text-muted-foreground">
                    {new Date(benefit.validTo).toLocaleDateString('ko-KR')}까지
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Merchant Info */}
          {merchant && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">매장 정보</h3>
                
                {/* Mini Map */}
                <div 
                  className="relative rounded-lg overflow-hidden mb-4 h-40 bg-muted flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    if (merchantCoords && merchant) {
                      setIsMapModalOpen(true);
                    }
                  }}
                  data-testid="button-map-preview"
                >
                  {merchantCoords && merchant ? (
                    <>
                      <iframe
                        src={`https://map.naver.com/p/embed/search/${encodeURIComponent(merchant.name)}?c=${merchantCoords.lng},${merchantCoords.lat},16,0,0,0,dh`}
                        className="w-full h-full pointer-events-none"
                        style={{ border: 0 }}
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="bg-white/90 px-4 py-2 rounded-lg flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm font-medium">지도에서 보기</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="text-4xl">🗺️</span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm" data-testid="text-merchant-address">{merchant.address}</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleCopyAddress}
                        className="text-sm text-primary mt-1 p-0 h-auto"
                        data-testid="button-copy-address"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        주소 복사
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm" data-testid="text-merchant-phone">{merchant.phone}</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleCall}
                        className="text-sm text-primary mt-1 p-0 h-auto"
                        data-testid="button-call"
                      >
                        전화하기
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">매일 09:00 - 22:00</p>
                      <p className="text-xs text-muted-foreground mt-1">월요일 휴무</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleDirections}
                    data-testid="button-directions-modal"
                  >
                    <Navigation className="w-5 h-5 mr-2" />
                    길찾기
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleShare}
                    data-testid="button-share"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    공유
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Terms */}
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-3">유의사항</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>제주대학교 재학생 대상</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>제주대학교 포털에서 재학생 인증 후 사용가능</span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <div className="sticky bottom-0 bg-card pt-4 -mx-4 px-4 border-t">
            <Button
              className="w-full py-4 text-lg font-semibold"
              onClick={() => {
                window.open('https://portal.jejunu.ac.kr/login.htm', '_blank', 'noopener,noreferrer');
              }}
              data-testid="button-use-benefit"
            >
              이용하기
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* Fullscreen Map Modal */}
      {merchantCoords && merchant && (
        <FullscreenMapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          center={merchantCoords}
          merchantName={merchant.name}
        />
      )}
    </>
  );
}
