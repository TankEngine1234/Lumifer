import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCamera } from '../../hooks/useCamera';
import { blurFade } from '../../animations/variants';
import Viewfinder from './Viewfinder';
import CaptureButton from './CaptureButton';

interface Props {
  isLocked: boolean;
  onCapture: (imageDataUrl: string) => void;
  onLock: () => void;
}

export default function CameraView({ isLocked, onCapture, onLock }: Props) {
  const { videoRef, isReady, error, retry, captureFrame } = useCamera();
  const [flash, setFlash] = useState(false);

  const handleCapture = useCallback(() => {
    if (!isLocked) {
      onLock();
      return;
    }

    setFlash(true);
    setTimeout(() => setFlash(false), 300);

    const imageUrl = captureFrame();
    if (imageUrl) {
      onCapture(imageUrl);
    }
  }, [isLocked, onLock, captureFrame, onCapture]);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden"
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(245,245,245,0.14), transparent 35%, rgba(17,17,17,0.22))' }}
      />

      <motion.div
        className="absolute top-10 left-1/2 -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="glass px-4 py-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#2D5A27' }} />
          <span className="text-sm font-bold" style={{ color: '#111111' }}>
            Scan leaf in Zone A3
          </span>
        </div>
      </motion.div>

      <Viewfinder isLocked={isLocked} />
      <CaptureButton onCapture={handleCapture} disabled={!isReady} />

      <AnimatePresence>
        {flash && (
          <motion.div
            className="absolute inset-0 bg-white z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-40 px-4" style={{ background: 'rgba(245,245,245,0.94)' }}>
          <div className="app-card w-full max-w-[360px] p-6 text-center flex flex-col items-center gap-4">
            <p className="app-label">Camera unavailable</p>
            <p className="app-text" style={{ textAlign: 'center' }}>{error}</p>
            <button
              className="app-button-secondary"
              onClick={retry}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
