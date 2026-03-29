import { useState, useCallback, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onCapture(dataUrl);
    };
    reader.readAsDataURL(file);

    // Reset so the same file can be re-selected
    e.target.value = '';
  }, [onCapture]);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden"
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

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

      {/* Upload button */}
      <motion.button
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white/80 text-xs font-medium active:scale-95 transition-transform"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        Upload Image
      </motion.button>

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
          <div className="text-center p-6 flex flex-col items-center gap-4">
            <p className="text-red-400 text-sm">Camera unavailable</p>
            <p className="text-white/40 text-xs max-w-[220px] leading-relaxed">{error}</p>
            <button
              className="px-5 py-2 glass text-sm font-medium text-white/80 active:scale-95 transition-transform"
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
