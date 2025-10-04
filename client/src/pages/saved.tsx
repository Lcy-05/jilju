import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { BenefitCard } from '@/components/benefit/benefit-card';
import { BenefitModal } from '@/components/benefit/benefit-modal';
import { CouponModal } from '@/components/coupon/coupon-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Benefit, Coupon } from '@/types';
import { API_ENDPOINTS } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function Saved() {
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('bookmarks');

  const { user, isAuthenticated } = useAuth();

  // Parse URL tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['bookmarks', 'recent', 'coupons'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Get user bookmarks
  const { data: bookmarksData, isLoading: bookmarksLoading } = useQuery({
    queryKey: [API_ENDPOINTS.BOOKMARKS.LIST.replace(':userId', user?.id || '')],
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Get user coupons (active)
  const { data: activeCoupons, isLoading: activeCouponsLoading } = useQuery({
    queryKey: [API_ENDPOINTS.COUPONS.USER_COUPONS.replace(':userId', user?.id || ''), 'active'],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'active' });
      const response = await fetch(`${API_ENDPOINTS.COUPONS.USER_COUPONS.replace(':userId', user?.id || '')}?${params}`);
      return response.json();
    },
    enabled: isAuthenticated && !!user,
    staleTime: 1 * 60 * 1000, // 1 minute for coupon data
  });

  // Get user coupons (used)
  const { data: usedCoupons } = useQuery({
    queryKey: [API_ENDPOINTS.COUPONS.USER_COUPONS.replace(':userId', user?.id || ''), 'used'],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'used' });
      const response = await fetch(`${API_ENDPOINTS.COUPONS.USER_COUPONS.replace(':userId', user?.id || '')}?${params}`);
      return response.json();
    },
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Get user coupons (expired)
  const { data: expiredCoupons } = useQuery({
    queryKey: [API_ENDPOINTS.COUPONS.USER_COUPONS.replace(':userId', user?.id || ''), 'expired'],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'expired' });
      const response = await fetch(`${API_ENDPOINTS.COUPONS.USER_COUPONS.replace(':userId', user?.id || '')}?${params}`);
      return response.json();
    },
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const handleBenefitClick = (benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setIsBenefitModalOpen(true);
  };

  const handleCouponClick = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsCouponModalOpen(true);
  };

  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date();
    if (coupon.redeemedAt) return 'used';
    if (new Date(coupon.expireAt) < now) return 'expired';
    return 'active';
  };

  const getCouponTimeInfo = (coupon: Coupon) => {
    const status = getCouponStatus(coupon);
    
    if (status === 'used') {
      return formatDistanceToNow(new Date(coupon.redeemedAt!), { 
        addSuffix: true, 
        locale: ko 
      }) + ' 사용됨';
    }
    
    if (status === 'expired') {
      return '만료됨';
    }
    
    // Active coupon - show time left
    const timeLeft = new Date(coupon.expireAt).getTime() - new Date().getTime();
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    
    if (minutesLeft <= 0) return '곧 만료';
    if (minutesLeft < 60) return `${minutesLeft}분 남음`;
    
    const hoursLeft = Math.floor(minutesLeft / 60);
    return `${hoursLeft}시간 남음`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-muted-foreground mb-4">
              저장된 혜택과 쿠폰을 보려면 로그인하세요
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              로그인하기
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const bookmarks = (bookmarksData as any)?.bookmarks || [];
  const activeCouponList = activeCoupons?.coupons || [];
  const usedCouponList = usedCoupons?.coupons || [];
  const expiredCouponList = expiredCoupons?.coupons || [];
  const allCoupons = [...activeCouponList, ...usedCouponList, ...expiredCouponList];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bookmarks" data-testid="tab-bookmarks">
              즐겨찾기 ({bookmarks.length})
            </TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent">
              최근 본
            </TabsTrigger>
            <TabsTrigger value="coupons" data-testid="tab-coupons">
              발급 쿠폰 ({allCoupons.length})
            </TabsTrigger>
          </TabsList>

          {/* Bookmarks Tab */}
          <TabsContent value="bookmarks" className="mt-6">
            {bookmarksLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton h-24 rounded-xl" />
                ))}
              </div>
            ) : bookmarks.length > 0 ? (
              <div className="space-y-3">
                {bookmarks.map((benefit: Benefit) => (
                  <BenefitCard
                    key={benefit.id}
                    benefit={benefit}
                    variant="horizontal"
                    onClick={() => handleBenefitClick(benefit)}
                    isBookmarked={true}
                    showMerchant={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold mb-2">저장된 혜택이 없습니다</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  마음에 드는 혜택을 저장해보세요
                </p>
                <Button onClick={() => window.location.href = '/discover'}>
                  혜택 둘러보기
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Recent Tab */}
          <TabsContent value="recent" className="mt-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👁️</div>
              <h3 className="text-lg font-semibold mb-2">최근 본 혜택</h3>
              <p className="text-sm text-muted-foreground">
                곧 최근 본 혜택 기능이 추가됩니다
              </p>
            </div>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="mt-6">
            {activeCouponsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton h-24 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Coupons */}
                {activeCouponList.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-primary">
                      진행중 ({activeCouponList.length})
                    </h4>
                    <div className="space-y-3">
                      {activeCouponList.map((coupon: Coupon) => (
                        <div
                          key={coupon.id}
                          className="bg-card rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-primary"
                          onClick={() => handleCouponClick(coupon)}
                          data-testid={`card-coupon-${coupon.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="badge-percent">
                                  {coupon.benefit?.type === 'PERCENT' && `${coupon.benefit.percent}%`}
                                  {coupon.benefit?.type === 'AMOUNT' && `${coupon.benefit.amount?.toLocaleString()}원`}
                                  {coupon.benefit?.type === 'GIFT' && '증정'}
                                  {coupon.benefit?.type === 'MEMBERSHIP' && '멤버십'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {getCouponTimeInfo(coupon)}
                                </Badge>
                              </div>
                              <h4 className="font-semibold text-sm mb-1" data-testid="text-coupon-title">
                                {coupon.benefit?.title}
                              </h4>
                              <p className="text-xs text-muted-foreground" data-testid="text-coupon-merchant">
                                {coupon.benefit?.merchant?.name}
                              </p>
                            </div>
                            
                            <div className="text-right text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {formatDistanceToNow(new Date(coupon.expireAt), { locale: ko })} 후 만료
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Used Coupons */}
                {usedCouponList.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 text-muted-foreground">
                      사용완료 ({usedCouponList.length})
                    </h4>
                    <div className="space-y-3">
                      {usedCouponList.map((coupon: Coupon) => (
                        <div
                          key={coupon.id}
                          className="bg-card rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow opacity-75"
                          onClick={() => handleCouponClick(coupon)}
                          data-testid={`card-coupon-used-${coupon.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary">사용완료</Badge>
                              </div>
                              <h4 className="font-semibold text-sm mb-1">
                                {coupon.benefit?.title}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {coupon.benefit?.merchant?.name}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getCouponTimeInfo(coupon)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No coupons message */}
                {allCoupons.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎫</div>
                    <h3 className="text-lg font-semibold mb-2">발급된 쿠폰이 없습니다</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      혜택을 찾아서 쿠폰을 발급받아보세요
                    </p>
                    <Button onClick={() => window.location.href = '/discover'}>
                      혜택 찾기
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />

      {/* Modals */}
      <BenefitModal
        benefit={selectedBenefit}
        isOpen={isBenefitModalOpen}
        onClose={() => setIsBenefitModalOpen(false)}
      />

      <CouponModal
        coupon={selectedCoupon}
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        onViewInWallet={() => setIsCouponModalOpen(false)}
      />
    </div>
  );
}
