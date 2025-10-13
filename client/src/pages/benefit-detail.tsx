import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { BenefitModal } from '@/components/benefit/benefit-modal';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Benefit } from '@/types';
import { API_ENDPOINTS } from '@/lib/constants';

export default function BenefitDetail() {
  const [match, params] = useRoute('/benefits/:id');

  // Get benefit details
  const { data: benefitData, isLoading, error } = useQuery({
    queryKey: [API_ENDPOINTS.BENEFITS.DETAIL, params?.id],
    enabled: !!params?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Get merchant details
  const { data: merchantData } = useQuery({
    queryKey: [API_ENDPOINTS.MERCHANTS.DETAIL, benefitData?.benefit?.merchantId],
    enabled: !!benefitData?.benefit?.merchantId,
    staleTime: 10 * 60 * 1000,
  });

  const handleBack = () => {
    window.history.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <div className="p-4">
          <div className="space-y-4">
            <div className="skeleton h-56 rounded-xl" />
            <div className="skeleton h-8 w-3/4 rounded" />
            <div className="skeleton h-6 w-1/2 rounded" />
            <div className="skeleton h-32 rounded-lg" />
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (error || !benefitData?.benefit) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">😵</div>
            <h2 className="text-xl font-bold mb-2">혜택을 찾을 수 없습니다</h2>
            <p className="text-sm text-muted-foreground mb-4">
              삭제되었거나 존재하지 않는 혜택입니다
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const benefit = benefitData.benefit as Benefit;
  const merchant = merchantData?.merchant;

  return (
    <div className="min-h-screen bg-background">
      {/* Custom Header with Back Button */}
      <header className="sticky top-0 z-50 bg-card px-4 py-3 safe-top shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-2 -ml-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold truncate">혜택 상세</h1>
        </div>
      </header>

      {/* Benefit Detail Modal as Full Page */}
      <BenefitModal
        benefit={benefit}
        merchant={merchant}
        isOpen={true}
        onClose={handleBack}
      />

      <BottomNavigation />
    </div>
  );
}
