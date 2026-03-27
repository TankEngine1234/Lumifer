import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ProcessingResult } from '../../types';
import { renderHeatmapToCanvas } from '../../pipeline/heatmapRenderer';
import { blurFade } from '../../animations/variants';

interface Props {
  capturedImage: string | null;
  processingResult: ProcessingResult | null;
  onComplete: () => void;
}

export default function SpectralHeatmap({ capturedImage, processingResult, onComplete }: Props) {
  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const hasRendered = useRef(false);

  // Generate heatmap on mount
  useEffect(() => {
    if (!processingResult || hasRendered.current) return;
    hasRendered.current = true;

    const url = renderHeatmapToCanvas(
      processingResult.originalImageData,
      processingResult.leafMask
    );
    setHeatmapUrl(url);

    // Auto-advance after heatmap animation completes
    setTimeout(() => onComplete(), 7000);
  }, [processingResult, onComplete]);

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden"
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Original captured image */}
      {capturedImage && (
        <img
          src={capturedImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Heatmap overlay with scan-line reveal */}
      {heatmapUrl && (
        <>
          {/* Heatmap image — revealed by clip-path animation */}
          <motion.div
            className="absolute inset-0"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
          >
            <img
              src={heatmapUrl}
              alt="Spectral heatmap"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Scan line — bright horizontal line sweeping down */}
          <motion.div
            className="absolute left-0 right-0 h-1 z-20"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.8), rgba(6, 182, 212, 0.8), transparent)',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(6, 182, 212, 0.2)',
            }}
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
          />
        </>
      )}

      {/* Label overlay */}
      <motion.div
        className="absolute top-14 left-0 right-0 z-30 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="inline-flex items-center gap-2 px-4 py-2 glass text-sm font-medium text-white/90">
          Spectral Analysis
        </span>
      </motion.div>

      {/* Color ramp legend */}
      <motion.div
        className="absolute bottom-24 left-6 right-6 z-30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.5, duration: 0.5 }}
      >
        <div className="glass p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50">Chlorophyll Absorption Index</span>
          </div>
          <div
            className="h-3 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #EF4444, #EAB308, #22C55E, #06B6D4, #1E3A8A)',
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-white/40">Deficient</span>
            <span className="text-[10px] text-white/40">Healthy</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
