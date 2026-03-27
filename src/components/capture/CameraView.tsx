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
  const { videoRef, isReady, error, captureFrame } = useCamera();
  const [flash, setFlash] = useState(false);

  const handleCapture = useCallback(() => {
    if (!isLocked) {
      // First tap: lock the viewfinder
      onLock();
      return;
    }

    // Second state: capture the frame
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
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Zone label */}
      <motion.div
        className="absolute top-14 left-0 right-0 z-20 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <span className="inline-flex items-center gap-2 px-3 py-1.5 glass text-xs font-medium text-white/80">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          Scan leaf in Zone A3
        </span>
      </motion.div>

      {/* Viewfinder brackets */}
      <Viewfinder isLocked={isLocked} />

      {/* Capture button */}
      <CaptureButton onCapture={handleCapture} disabled={!isReady} />

      {/* Flash overlay */}
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

      {/* Camera error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
          <div className="text-center p-6">
            <p className="text-red-400 text-sm mb-2">Camera unavailable</p>
            <p className="text-white/40 text-xs">{error}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
