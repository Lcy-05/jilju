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
}

export function Header({ onLocationClick, onSearchChange, onSearchSubmit, className }: HeaderProps) {
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
      "sticky top-0 z-50 bg-card px-4 py-3 safe-top shadow-sm",
      className
    )}>
      <div className="flex items-center gap-3">
        {/* Location Chip */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onLocationClick}
          className="flex items-center gap-1.5 bg-muted hover:bg-muted/80 px-3 py-1.5 h-auto rounded-full"
          data-testid="button-location"
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium" data-testid="text-location">
            {location?.region || '위치 선택'}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Input
            type="text"
            placeholder="업체, 혜택, 카테고리 검색"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-muted text-sm pl-10 pr-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary border-0"
            data-testid="input-search"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        </form>
      </div>
    </header>
  );
}
