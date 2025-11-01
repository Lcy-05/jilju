import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, 
  Settings, 
  Bell, 
  HelpCircle, 
  FileText, 
  LogOut,
  ChevronRight,
  MessageCircle,
  Info,
  Users,
  BookOpen,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { API_ENDPOINTS, APP_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Form schema for inquiry
const inquirySchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이하로 입력해주세요'),
  content: z.string().min(10, '내용은 최소 10자 이상 입력해주세요').max(2000, '내용은 2000자 이하로 입력해주세요'),
});

export default function Profile() {
  const { user, logout, isAuthenticated, hasRole } = useAuth();
  const { toast } = useToast();
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isCreatorsModalOpen, setIsCreatorsModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Get user stats
  const { data: userStats } = useQuery({
    queryKey: [`/api/users/${user?.id}/stats`],
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Inquiry form
  const inquiryForm = useForm<z.infer<typeof inquirySchema>>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  // Create inquiry mutation
  const createInquiryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inquirySchema>) => {
      const response = await apiRequest('POST', '/api/inquiries', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: '문의 접수 완료',
        description: '문의가 성공적으로 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.',
      });
      setIsInquiryModalOpen(false);
      inquiryForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
    },
    onError: (error: any) => {
      toast({
        title: '문의 접수 실패',
        description: error.message || '문의를 접수하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleEditProfile = () => {
    console.log('Edit profile - to be implemented');
  };

  const handleOpenNotifications = async () => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      toast({
        title: '알림 기능 미지원',
        description: '현재 브라우저에서는 알림 기능을 지원하지 않습니다.',
        variant: 'destructive',
      });
      return;
    }

    // If already granted, show success message
    if (Notification.permission === 'granted') {
      toast({
        title: '알림이 이미 허용되어 있습니다',
        description: '질주의 새로운 혜택과 소식을 받아보실 수 있습니다.',
      });
      return;
    }

    // If already denied, inform user
    if (Notification.permission === 'denied') {
      toast({
        title: '알림이 차단되어 있습니다',
        description: '브라우저 설정에서 알림 권한을 허용해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // Request permission
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        toast({
          title: '알림 설정 완료',
          description: '질주의 새로운 혜택과 소식을 받아보실 수 있습니다.',
        });

        // Send a test notification
        new Notification('질주 알림 설정 완료', {
          body: '제주의 모든 혜택을 놓치지 마세요!',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      } else if (permission === 'denied') {
        toast({
          title: '알림 설정 거부됨',
          description: '나중에 브라우저 설정에서 변경할 수 있습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Notification permission error:', error);
      toast({
        title: '알림 설정 실패',
        description: '알림 권한을 요청하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenInquiry = () => {
    setIsInquiryModalOpen(true);
  };

  const handleOpenHelp = () => {
    console.log('Open help - to be implemented');
  };

  const handleOpenTerms = () => {
    setIsPdfModalOpen(true);
  };

  const handleOpenCreators = () => {
    setIsCreatorsModalOpen(true);
  };

  const handleOpenSource = () => {
    setIsSourceModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pb-20">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">👋</div>
            <h2 className="text-xl font-bold mb-2 text-white">로그인이 필요합니다</h2>
            <p className="text-sm text-white/60 mb-4">
              프로필을 보려면 로그인하세요
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

  const stats = (userStats as any) || { totalBenefits: 0, bookmarks: 0 };

  return (
    <div className="min-h-screen pb-20">
      <main className="px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 shrink-0">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold truncate" data-testid="text-user-name">
                    {user?.name || '사용자'}
                  </h3>
                  {user?.roles?.includes('MERCHANT_OWNER') && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      업주
                    </Badge>
                  )}
                  {user?.roles?.includes('OPERATOR') && (
                    <Badge className="text-xs shrink-0">
                      운영자
                    </Badge>
                  )}
                  {user?.roles?.includes('ADMIN') && (
                    <Badge variant="destructive" className="text-xs shrink-0">
                      관리자
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate" data-testid="text-user-email">
                  {user?.email}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditProfile}
                className="p-2 shrink-0"
                data-testid="button-edit-profile"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-total-benefits-count">
                  {stats.totalBenefits}
                </div>
                <div className="text-xs text-muted-foreground mt-1">전체 제휴</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-bookmarks-count">
                  {stats.bookmarks}
                </div>
                <div className="text-xs text-muted-foreground mt-1">즐겨찾기</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase px-4 py-2">설정</h4>
          
          <Card>
            <CardContent className="p-0">
              <Button
                variant="ghost"
                className="w-full justify-between h-auto p-4"
                onClick={handleOpenNotifications}
                data-testid="button-notifications"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">알림 설정</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase px-4 py-2">고객 지원</h4>
          
          <Card>
            <CardContent className="p-0">
              <Button
                variant="ghost"
                className="w-full justify-between h-auto p-4"
                onClick={handleOpenInquiry}
                data-testid="button-inquiry"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">문의하기</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
              
              <div className="border-t border-border" />
              
              <Button
                variant="ghost"
                className="w-full justify-between h-auto p-4"
                onClick={handleOpenHelp}
                data-testid="button-help"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">고객센터</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
              
              <div className="border-t border-border" />
              
              <Button
                variant="ghost"
                className="w-full justify-between h-auto p-4"
                onClick={handleOpenTerms}
                data-testid="button-terms"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">약관 및 정책</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase px-4 py-2">정보</h4>
          
          <Card>
            <CardContent className="p-0">
              <Button
                variant="ghost"
                className="w-full justify-between h-auto p-4"
                onClick={handleOpenCreators}
                data-testid="button-creators"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">제작자</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
              
              <div className="border-t border-border" />
              
              <Button
                variant="ghost"
                className="w-full justify-between h-auto p-4"
                onClick={handleOpenSource}
                data-testid="button-source"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">출처</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Logout */}
        <Card>
          <CardContent className="p-0">
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-auto p-4"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">로그아웃</span>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* App Version */}
        <div className="text-center text-xs text-muted-foreground space-y-1 py-6">
          <p>{APP_CONFIG.NAME} v{APP_CONFIG.VERSION}</p>
          <p>@JNU_for_run</p>
        </div>
      </main>

      <BottomNavigation />

      {/* PDF Agreement Modal */}
      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-full w-screen h-screen p-0 m-0 rounded-none">
          <VisuallyHidden>
            <DialogTitle>제주대학교 58대 총학생회 선거운동본부 협력 업체 제휴협약서</DialogTitle>
            <DialogDescription>
              제주대학교 58대 총학생회 선거운동본부와 협력 업체 간의 제휴협약서를 확인하실 수 있습니다.
            </DialogDescription>
          </VisuallyHidden>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPdfModalOpen(false)}
            className="absolute top-4 right-4 z-50 bg-white hover:bg-white/90 rounded-full w-10 h-10 shadow-lg"
            data-testid="button-close-pdf-modal"
          >
            <X className="w-5 h-5 text-black" />
          </Button>

          {/* PDF Viewer - Full Screen */}
          <div className="w-full h-full">
            <object
              data="/jeju-university-agreement.pdf#view=FitH"
              type="application/pdf"
              className="w-full h-full"
              title="제주대학교 58대 총학생회 선거운동본부 협력 업체 제휴협약서"
            >
              <iframe
                src="/jeju-university-agreement.pdf#view=FitH"
                className="w-full h-full border-0"
                title="제주대학교 58대 총학생회 선거운동본부 협력 업체 제휴협약서"
              />
            </object>
          </div>
        </DialogContent>
      </Dialog>

      {/* Creators Modal */}
      <Dialog open={isCreatorsModalOpen} onOpenChange={setIsCreatorsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>제작자</DialogTitle>
          <DialogDescription>
            질주 플랫폼 제작팀
          </DialogDescription>
          
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-semibold mb-2">개발팀</h4>
              <p className="text-sm text-muted-foreground">제주대학교 58대 총학생회</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">디자인</h4>
              <p className="text-sm text-muted-foreground">제주대학교 58대 총학생회</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">기획</h4>
              <p className="text-sm text-muted-foreground">제주대학교 58대 총학생회 선거운동본부</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Source Modal */}
      <Dialog open={isSourceModalOpen} onOpenChange={setIsSourceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>출처</DialogTitle>
          <DialogDescription>
            질주 플랫폼에서 사용된 리소스 출처
          </DialogDescription>
          
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-semibold mb-2">지도 서비스</h4>
              <p className="text-sm text-muted-foreground">Naver Maps API</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">아이콘</h4>
              <p className="text-sm text-muted-foreground">Lucide React Icons</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">폰트</h4>
              <p className="text-sm text-muted-foreground">Gmarket Sans</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">제휴 업체 정보</h4>
              <p className="text-sm text-muted-foreground">제주대학교 58대 총학생회 선거운동본부</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inquiry Modal */}
      <Dialog open={isInquiryModalOpen} onOpenChange={setIsInquiryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>문의하기</DialogTitle>
          <DialogDescription>
            궁금한 사항이나 문의 내용을 남겨주세요. 빠르게 답변드리겠습니다.
          </DialogDescription>
          
          <Form {...inquiryForm}>
            <form 
              onSubmit={inquiryForm.handleSubmit((data) => createInquiryMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={inquiryForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="문의 제목을 입력하세요" 
                        {...field}
                        data-testid="input-inquiry-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={inquiryForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>내용</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="문의 내용을 자세히 작성해주세요 (최소 10자)" 
                        className="min-h-[150px] resize-none"
                        {...field}
                        data-testid="textarea-inquiry-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInquiryModalOpen(false)}
                  disabled={createInquiryMutation.isPending}
                  data-testid="button-cancel-inquiry"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={createInquiryMutation.isPending}
                  data-testid="button-submit-inquiry"
                >
                  {createInquiryMutation.isPending ? '접수 중...' : '문의 접수'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
