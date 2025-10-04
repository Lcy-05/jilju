import { useLocation as useRouterLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Home, Search, Map, Bookmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'home', path: '/', label: '홈', icon: Home },
  { id: 'discover', path: '/discover', label: '탐색', icon: Search },
  { id: 'map', path: '/map', label: '지도', icon: Map },
  { id: 'saved', path: '/saved', label: '저장함', icon: Bookmark },
  { id: 'profile', path: '/profile', label: '내 정보', icon: User }
];

interface BottomNavigationProps {
  className?: string;
}

export function BottomNavigation({ className }: BottomNavigationProps) {
  const [location, setLocation] = useRouterLocation();

  const getCurrentTab = () => {
    const currentTab = tabs.find(tab => {
      if (tab.path === '/') {
        return location === '/' || location === '';
      }
      return location.startsWith(tab.path);
    });
    return currentTab?.id || 'home';
  };

  const currentTab = getCurrentTab();

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border safe-bottom z-50",
      className
    )}>
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ id, path, label, icon: Icon }) => {
          const isActive = currentTab === id;
          
          return (
            <Button
              key={id}
              variant="ghost"
              size="sm"
              onClick={() => setLocation(path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 h-full rounded-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              data-testid={`button-tab-${id}`}
            >
              <Icon 
                className="w-6 h-6" 
                fill={isActive ? "currentColor" : "none"}
              />
              <span className={cn(
                "text-xs",
                isActive ? "font-medium" : ""
              )}>
                {label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
