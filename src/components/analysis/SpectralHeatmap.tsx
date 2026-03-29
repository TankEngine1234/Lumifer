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

  useEffect(() => {
    if (!processingResult || hasRendered.current) return;
    hasRendered.current = true;

    const url = renderHeatmapToCanvas(
      processingResult.originalImageData,
      processingResult.leafMask
    );
    setHeatmapUrl(url);
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
      {capturedImage && (
        <img
          src={capturedImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {heatmapUrl && (
        <>
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

          <motion.div
            className="absolute left-0 right-0 h-1 z-20"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(45,90,39,0.9), rgba(45,90,39,0.4), transparent)',
              boxShadow: '0 0 16px rgba(45,90,39,0.26)',
            }}
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
          />
        </>
      )}

      <motion.div
        className="absolute top-10 left-1/2 -translate-x-1/2 z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="glass inline-flex items-center gap-2 px-4 py-3 text-base font-bold" style={{ color: '#111111' }}>
          Spectral Analysis
        </span>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-32px)] max-w-[480px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.5, duration: 0.5 }}
      >
        <div className="glass p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="section-label">Chlorophyll Absorption Index</span>
          </div>
          <div
            className="h-3 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #111111, #2D5A27, #4A7A44, #6B9165)',
            }}
          />
          <div className="flex justify-between mt-2">
            <span className="section-label">Deficient</span>
            <span className="section-label">Healthy</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
