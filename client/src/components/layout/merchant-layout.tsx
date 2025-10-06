import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Store, Gift, LogOut, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MerchantLayoutProps {
  children: React.ReactNode;
}

export function MerchantLayout({ children }: MerchantLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: '대시보드',
      href: '/merchant/dashboard',
      icon: LayoutDashboard
    },
    {
      name: '매장 관리',
      href: '/merchant/store',
      icon: Store
    },
    {
      name: '혜택 관리',
      href: '/merchant/benefits',
      icon: Gift
    }
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                홈으로
              </Button>
            </Link>
          </div>
          <h1 className="text-lg font-semibold">가맹점 센터</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-border">
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h1 className="text-xl font-bold">가맹점 센터</h1>
            </div>
            
            <nav className="flex-1 px-4 py-6 space-y-1">
              {navigation.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </a>
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 py-4 border-t border-border">
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2" 
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-64">
          <div className="container max-w-7xl mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <nav className="flex justify-around py-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs",
                    isActive 
                      ? "text-primary font-semibold" 
                      : "text-muted-foreground"
                  )}
                  data-testid={`mobile-nav-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
