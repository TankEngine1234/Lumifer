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
