import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Copy } from 'lucide-react';
import { Coupon } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CouponModalProps {
  coupon: Coupon | null;
  isOpen: boolean;
  onClose: () => void;
  onViewInWallet?: () => void;
}

export function CouponModal({ coupon, isOpen, onClose, onViewInWallet }: CouponModalProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const { toast } = useToast();

  // Update countdown timer
  useEffect(() => {
    if (!coupon || !isOpen) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(coupon.expireAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('만료됨');
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [coupon, isOpen]);

  const handleCopyToken = () => {
    if (coupon?.token) {
      navigator.clipboard.writeText(coupon.token);
      toast({
        title: '쿠폰 번호 복사됨',
        description: '쿠폰 번호가 클립보드에 복사되었습니다.',
      });
    }
  };

  const handleCopyPin = () => {
    if (coupon?.pin) {
      navigator.clipboard.writeText(coupon.pin);
      toast({
        title: 'PIN 번호 복사됨',
        description: 'PIN 번호가 클립보드에 복사되었습니다.',
      });
    }
  };

  if (!coupon) return null;

  const getBenefitInfo = () => {
    if (!coupon.benefit) return { title: '혜택 정보', subtitle: '쿠폰' };
    
    const benefit = coupon.benefit;
    let title = '';
    
    switch (benefit.type) {
      case 'PERCENT':
        title = `${benefit.percent}% 할인`;
        break;
      case 'AMOUNT':
        title = `${benefit.amount?.toLocaleString()}원 할인`;
        break;
      case 'GIFT':
        title = benefit.gift || '증정';
        break;
      case 'MEMBERSHIP':
        title = `${benefit.membershipTier} 멤버십`;
        break;
      default:
        title = benefit.title;
    }

    return {
      title,
      subtitle: benefit.merchant?.name || '매장 정보 없음'
    };
  };

  const benefitInfo = getBenefitInfo();
  const isExpired = new Date() > new Date(coupon.expireAt);
  const isUsed = !!coupon.redeemedAt;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto p-0">
        <div className="p-6 space-y-6">
          {/* Coupon Design */}
          <div className="relative">
            <div className={cn(
              "rounded-xl p-6 text-white mb-6",
              isUsed ? "bg-gray-500" : isExpired ? "bg-red-500" : "bg-gradient-to-br from-primary to-primary/80"
            )}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <DialogHeader className="p-0">
                    <DialogTitle className="text-xl font-bold text-white" data-testid="text-coupon-title">
                      {benefitInfo.title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      {benefitInfo.subtitle} 쿠폰 상세 정보 및 사용 방법
                    </DialogDescription>
                  </DialogHeader>
                  <p className="text-sm opacity-90 mt-1" data-testid="text-coupon-merchant">
                    {benefitInfo.subtitle}
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs font-medium",
                    isUsed ? "bg-gray-600" : isExpired ? "bg-red-600" : "bg-white/20"
                  )}
                >
                  {isUsed ? '사용완료' : isExpired ? '만료됨' : '발급완료'}
                </Badge>
              </div>

              {/* QR Code Placeholder */}
              <div className="bg-white rounded-lg p-4 mx-auto w-48 h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto bg-gray-100 flex items-center justify-center rounded-lg">
                    <span className="text-4xl">📱</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">QR 코드</p>
                </div>
              </div>

              {/* Token */}
              <div className="mt-4 text-center">
                <p className="text-xs opacity-75">쿠폰 번호</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="font-mono text-sm" data-testid="text-coupon-token">
                    {coupon.token.slice(0, 12)}...
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyToken}
                    className="p-1 h-auto text-white hover:bg-white/20"
                    data-testid="button-copy-token"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Countdown Timer */}
            {!isUsed && !isExpired && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-destructive" />
                    <span className="text-sm font-medium">남은 시간</span>
                  </div>
                  <div 
                    className="text-lg font-bold text-destructive" 
                    data-testid="text-time-left"
                  >
                    {timeLeft}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  발급일: {formatDistanceToNow(new Date(coupon.issuedAt), { 
                    addSuffix: true, 
                    locale: ko 
                  })}
                </p>
              </div>
            )}

            {/* Status Messages */}
            {isUsed && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
                <p className="text-sm font-medium text-green-800">
                  {formatDistanceToNow(new Date(coupon.redeemedAt!), { 
                    addSuffix: true, 
                    locale: ko 
                  })} 사용되었습니다
                </p>
              </div>
            )}

            {isExpired && !isUsed && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-center">
                <p className="text-sm font-medium text-red-800">
                  이 쿠폰은 만료되었습니다
                </p>
              </div>
            )}

            {/* Offline PIN */}
            {!isUsed && !isExpired && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  네트워크 불가 시 점주에게 PIN 제시
                </p>
                <div className="flex items-center justify-center gap-2">
                  <p 
                    className="text-2xl font-bold text-center tracking-wider" 
                    data-testid="text-coupon-pin"
                  >
                    {coupon.pin}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPin}
                    className="p-1 h-auto"
                    data-testid="button-copy-pin"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {onViewInWallet && (
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={onViewInWallet}
                  data-testid="button-view-wallet"
                >
                  쿠폰함에서 보기
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={onClose}
                data-testid="button-close-coupon"
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
