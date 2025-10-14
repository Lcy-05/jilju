import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { NaverMap } from './naver-map';
import { MapMarker } from '@/types';

interface FullscreenMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  center: { lat: number; lng: number };
  merchantName: string;
}

export function FullscreenMapModal({ 
  isOpen, 
  onClose, 
  center,
  merchantName 
}: FullscreenMapModalProps) {
  // Create a marker for the merchant location
  const markers: MapMarker[] = [{
    id: 'merchant-location',
    position: center,
    title: merchantName,
    type: 'merchant',
    data: { name: merchantName } as any
  }];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full w-screen h-screen p-0 m-0 rounded-none">
        {/* Close Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="absolute top-4 left-4 z-[1000] rounded-full w-10 h-10 p-0 shadow-lg"
          data-testid="button-close-fullscreen-map"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Merchant Name Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 px-4 py-2 rounded-full shadow-lg">
          <p className="font-semibold text-sm">{merchantName}</p>
        </div>

        {/* Fullscreen Map */}
        <div className="w-full h-full">
          <NaverMap
            center={center}
            zoom={16}
            markers={markers}
            showControls={true}
            className="w-full h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
