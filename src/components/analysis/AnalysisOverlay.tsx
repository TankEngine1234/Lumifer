import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Scan, Check } from 'lucide-react';
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

const STEPS = ['Segmenting', 'Computing indices', 'Running model'] as const;

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
  // Track which pipeline step is active (0 = segmenting, 1 = indices, 2 = model, 3 = done)
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (phase !== 'analyzing' || !capturedImage || hasProcessed.current) return;
    hasProcessed.current = true;

    async function analyze() {
      // Step 0: segmentation is triggered inside process()
      setActiveStep(0);
      const result = await process(capturedImage!);
      onProcessingComplete(result);

      // Step 1 & 2 are part of the same async call but we can tick forward
      setActiveStep(1);
      // Brief yield so the UI paints "Computing indices" before model inference
      await new Promise(r => setTimeout(r, 80));

      setActiveStep(2);
      const npkResult = await runInference(
        result.tensor as any,
        result.indices,
        result.colorData
      );
      onInferenceComplete(npkResult);
      setActiveStep(3);

      // Short hold so the user sees "done" state before transitioning
      setTimeout(() => onHeatmapReady(), 600);
    }

    analyze();
  }, [phase, capturedImage, isModelReady]);

  const isDone = activeStep >= 3;

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
        {/* Spinning ring — stops when done */}
        <motion.div
          className="relative w-24 h-24"
          animate={{ rotate: isDone ? 0 : 360 }}
          transition={isDone
            ? { duration: 0.3, ease: 'easeOut' }
            : { duration: 2, repeat: Infinity, ease: 'linear' }
          }
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
              stroke={isDone ? '#22C55E' : '#22C55E'}
              strokeWidth="4"
              strokeDasharray={isDone ? '276 0' : '70 210'}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isDone
              ? <Check className="w-8 h-8 text-green-400" strokeWidth={2.5} />
              : <Scan className="w-8 h-8 text-green-400" />
            }
          </div>
        </motion.div>

        {/* Status text */}
        <motion.div
          className="text-center"
          animate={{ opacity: isDone ? 1 : [0.5, 1, 0.5] }}
          transition={isDone ? { duration: 0.2 } : { duration: 2, repeat: Infinity }}
        >
          <p className="text-white font-medium text-lg">
            {isDone ? 'Analysis complete' : 'Analyzing leaf tissue'}
          </p>
          <p className="text-white/40 text-sm mt-1">
            {isDone ? 'Generating spectral heatmap…' : 'Reconstructing spectral signature...'}
          </p>
        </motion.div>

        {/* Processing steps — light up as each completes */}
        <div className="flex gap-3 mt-4">
          {STEPS.map((step, i) => {
            const done = activeStep > i;
            const active = activeStep === i;
            return (
              <motion.div
                key={step}
                className="px-3 py-1.5 glass text-xs flex items-center gap-1.5"
                style={{
                  color: done ? '#4ade80' : active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                  borderColor: done ? 'rgba(74,222,128,0.3)' : undefined,
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
              >
                {done && <Check className="w-3 h-3" strokeWidth={2.5} />}
                {step}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
