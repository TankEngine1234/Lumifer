import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Scan } from 'lucide-react';
import type { DemoPhase, ProcessingResult, NPKResult } from '../../types';
import { useImageProcessing } from '../../hooks/useImageProcessing';
import { useInference } from '../../hooks/useInference';
import { blurFade } from '../../animations/variants';

interface Props {
  capturedImage: string | null;
  phase: DemoPhase;
  onProcessingComplete: (result: ProcessingResult) => void;
  onInferenceComplete: (result: NPKResult) => void;
  onHeatmapReady: () => void;
}

export default function AnalysisOverlay({
  capturedImage,
  phase,
  onProcessingComplete,
  onInferenceComplete,
  onHeatmapReady,
}: Props) {
  const { process } = useImageProcessing();
  const { isModelReady, runInference } = useInference();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (phase !== 'analyzing' || !capturedImage || hasProcessed.current) return;
    hasProcessed.current = true;

    async function analyze() {
      // Process image
      const result = await process(capturedImage!);
      onProcessingComplete(result);

      // Run inference
      const npkResult = await runInference(
        result.tensor as any,
        result.indices,
        result.colorData
      );
      onInferenceComplete(npkResult);

      // Advance to heatmap after a brief delay for dramatic effect
      setTimeout(() => onHeatmapReady(), 2000);
    }

    // Small delay to let the analyzing animation play
    setTimeout(analyze, 1500);
  }, [phase, capturedImage, isModelReady]);

  return (
    <motion.div
      className="relative h-full w-full"
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Frozen captured image as background */}
      {capturedImage && (
        <img
          src={capturedImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Analysis indicators */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        {/* Spinning ring */}
        <motion.div
          className="relative w-24 h-24"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <svg viewBox="0 0 96 96" className="w-full h-full">
            <circle
              cx="48" cy="48" r="44"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="4"
            />
            <circle
              cx="48" cy="48" r="44"
              fill="none"
              stroke="#22C55E"
              strokeWidth="4"
              strokeDasharray="70 210"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Scan className="w-8 h-8 text-green-400" />
          </div>
        </motion.div>

        {/* Status text */}
        <motion.div
          className="text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-white font-medium text-lg">Analyzing leaf tissue</p>
          <p className="text-white/40 text-sm mt-1">
            Reconstructing spectral signature...
          </p>
        </motion.div>

        {/* Processing steps */}
        <div className="flex gap-3 mt-4">
          {['Segmenting', 'Computing indices', 'Running model'].map((step, i) => (
            <motion.div
              key={step}
              className="px-3 py-1.5 glass text-xs text-white/60"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.8 }}
            >
              {step}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
