import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BottomNavigation } from '@/components/layout/bottom-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  Bell, 
  Building2, 
  Plus, 
  HelpCircle, 
  FileText, 
  LogOut,
  ChevronRight,
  Shield,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { API_ENDPOINTS, APP_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Profile() {
  const { user, logout, isAuthenticated, hasRole } = useAuth();

  // Get user stats
  const { data: userStats } = useQuery({
    queryKey: ['/api/users', user?.id, 'stats'],
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleEditProfile = () => {
    console.log('Edit profile - to be implemented');
  };

  const handleOpenPermissions = () => {
    console.log('Open permissions - to be implemented');
  };

  const handleOpenNotifications = () => {
    console.log('Open notifications - to be implemented');
  };

  const handleOpenMerchantCenter = () => {
    window.location.href = '/merchant/wizard';
  };

  const handleSuggestPartnership = () => {
    console.log('Suggest partnership - to be implemented');
  };

  const handleOpenHelp = () => {
    console.log('Open help - to be implemented');
  };

  const handleOpenTerms = () => {
    console.log('Open terms - to be implemented');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">👋</div>
            <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-muted-foreground mb-4">
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

  const stats = userStats || { bookmarks: 0, coupons: 0, used: 0 };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold" data-testid="text-user-name">
                    {user?.name || '사용자'}
                  </h3>
                  {user?.roles?.includes('MERCHANT_OWNER') && (
                    <Badge variant="secondary" className="text-xs">
                      업주
                    </Badge>
                  )}
                  {user?.roles?.includes('OPERATOR') && (
                    <Badge className="text-xs">
                      운영자
                    </Badge>
                  )}
                  {user?.roles?.includes('ADMIN') && (
                    <Badge variant="destructive" className="text-xs">
                      관리자
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                  {user?.email}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditProfile}
                className="p-2"
                data-testid="button-edit-profile"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-bookmarks-count">
                  {stats.bookmarks}
                </div>
                <div className="text-xs text-muted-foreground mt-1">즐겨찾기</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-coupons-count">
                  {stats.coupons}
                </div>
                <div className="text-xs text-muted-foreground mt-1">발급 쿠폰</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-used-count">
                  {stats.used}
                </div>
                <div className="text-xs text-muted-foreground mt-1">사용 완료</div>
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
                onClick={handleOpenPermissions}
                data-testid="button-permissions"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">권한 센터</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
              
              <div className="border-t border-border" />
              
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

        {/* Merchant Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase px-4 py-2">업주 전용</h4>
          
          <Card>
            <CardContent className="p-0">
              <Button
                variant="ghost"
                className="w-full justify-between h-auto p-4"
                onClick={handleOpenMerchantCenter}
                data-testid="button-merchant-center"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">업주 센터</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
              
              <div className="border-t border-border" />
              
              <Button
                variant="ghost"
                className="w-full justify-between h-auto p-4"
                onClick={handleSuggestPartnership}
                data-testid="button-suggest-partnership"
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">제휴 제안하기</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Section (only for operators and admins) */}
        {hasRole('OPERATOR') || hasRole('ADMIN') ? (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase px-4 py-2">관리자</h4>
            
            <Card>
              <CardContent className="p-0">
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto p-4"
                  onClick={() => window.location.href = '/admin'}
                  data-testid="button-admin-console"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">관리자 콘솔</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Support Section */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase px-4 py-2">지원</h4>
          
          <Card>
            <CardContent className="p-0">
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
          <p>© 2024 Jilju. All rights reserved.</p>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
