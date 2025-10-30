import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, ChevronDown } from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onLocationClick?: () => void;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
  className?: string;
  selectedRegionName?: string; // 선택된 지역 이름 (필터용)
}

export function Header({ onLocationClick, onSearchChange, onSearchSubmit, className, selectedRegionName }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { location } = useLocation();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit?.(searchQuery);
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 bg-card px-3 py-2 safe-top shadow-sm",
      className
    )}>
      <div className="flex items-center gap-2">
        {/* Location Chip - Compact */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onLocationClick}
          className="flex items-center gap-1 bg-muted hover:bg-muted/80 px-2 py-1 h-auto rounded-full shrink-0"
          data-testid="button-location"
        >
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium" data-testid="text-location">
            {selectedRegionName || (location?.region && location.region !== '로딩 중...' ? location.region : '위치')}
          </span>
          <ChevronDown className="w-3 h-3" />
        </Button>

        {/* Search Bar - Compact */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Input
            type="text"
            placeholder="혜택 검색"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-muted text-xs pl-8 pr-3 py-1.5 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-primary border-0"
            data-testid="input-search"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </form>
      </div>
    </header>
  );
}
