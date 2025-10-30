import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import splashGif from '@assets/Comp 1_3_1761834119743.gif';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // GIF 애니메이션 재생 시간을 고려하여 3.5초 후 페이드아웃 시작
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: '#000000' }}
        >
          {/* GIF 이미지 - 전체 화면 커버 */}
          <img
            src={splashGif}
            alt="질주 로딩"
            className="w-full h-full object-cover"
            data-testid="splash-animation"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
