import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { BenefitCard } from '@/components/benefit/benefit-card';
import { BenefitModal } from '@/components/benefit/benefit-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { Benefit } from '@/types';
import { API_ENDPOINTS } from '@/lib/constants';

export default function Saved() {
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('bookmarks');

  const { user, isAuthenticated } = useAuth();

  // Parse URL tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['bookmarks', 'recent'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Get user bookmarks
  const { data: bookmarksData, isLoading: bookmarksLoading } = useQuery({
    queryKey: [API_ENDPOINTS.BOOKMARKS.LIST.replace(':userId', user?.id || '')],
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const handleBenefitClick = (benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setIsBenefitModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-muted-foreground mb-4">
              저장된 혜택을 보려면 로그인하세요
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bookmarks" data-testid="tab-bookmarks">
              즐겨찾기 ({bookmarks.length})
            </TabsTrigger>
            <TabsTrigger value="recent" data-testid="tab-recent">
              최근 본
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
        </Tabs>
      </div>

      <BottomNavigation />

      {/* Modals */}
      <BenefitModal
        benefit={selectedBenefit}
        isOpen={isBenefitModalOpen}
        onClose={() => setIsBenefitModalOpen(false)}
      />
    </div>
  );
}
