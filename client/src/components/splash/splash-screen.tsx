import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 2초 후 페이드아웃 시작
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

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
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: '#1a0a0a' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.6,
              delay: 0.2,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
            className="text-center"
          >
            {/* 질주 로고 */}
            <h1 
              className="text-7xl font-bold mb-4"
              style={{ color: '#ff0000', fontFamily: 'Gmarket Sans' }}
            >
              질주
            </h1>
            
            {/* 서브타이틀 */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="text-white/60 text-lg"
              style={{ fontFamily: 'Gmarket Sans' }}
            >
              제주의 모든 혜택
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
