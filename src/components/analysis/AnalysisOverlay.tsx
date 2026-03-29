import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Scan, Check } from 'lucide-react';
import type * as tf from '@tensorflow/tfjs';
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
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (phase !== 'analyzing' || !capturedImage || hasProcessed.current) return;
    hasProcessed.current = true;

    async function analyze() {
      setActiveStep(0);
      const result = await process(capturedImage);
      onProcessingComplete(result);

      setActiveStep(1);
      await new Promise(r => setTimeout(r, 80));

      setActiveStep(2);
      const npkResult = await runInference(
        result.tensor as tf.Tensor4D | null,
        result.indices,
        result.colorData
      );
      onInferenceComplete(npkResult);
      setActiveStep(3);

      setTimeout(() => onHeatmapReady(), 600);
    }

    analyze();
  }, [phase, capturedImage, isModelReady, onProcessingComplete, onInferenceComplete, onHeatmapReady, process, runInference]);

  const isDone = activeStep >= 3;

  return (
    <motion.div
      className="relative h-full w-full"
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

      <div className="absolute inset-0" style={{ background: 'rgba(245,245,245,0.86)' }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <div className="app-card w-full max-w-[420px] p-6 flex flex-col items-center gap-6">
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
                stroke="rgba(17,17,17,0.08)"
                strokeWidth="4"
              />
              <circle
                cx="48" cy="48" r="44"
                fill="none"
                stroke="#2D5A27"
                strokeWidth="4"
                strokeDasharray={isDone ? '276 0' : '70 210'}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.4s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {isDone
                ? <Check className="w-8 h-8" style={{ color: '#2D5A27' }} strokeWidth={2.5} />
                : <Scan className="w-8 h-8" style={{ color: '#2D5A27' }} />
              }
            </div>
          </motion.div>

          <motion.div
            className="text-center"
            animate={{ opacity: isDone ? 1 : [0.6, 1, 0.6] }}
            transition={isDone ? { duration: 0.2 } : { duration: 2, repeat: Infinity }}
          >
            <p className="text-2xl font-extrabold" style={{ color: '#111111' }}>
              {isDone ? 'Analysis complete' : 'Analyzing leaf tissue'}
            </p>
            <p className="app-text" style={{ marginTop: 8 }}>
              {isDone ? 'Generating spectral heatmap...' : 'Reconstructing spectral signature...'}
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            {STEPS.map((step, i) => {
              const done = activeStep > i;
              const active = activeStep === i;

              return (
                <motion.div
                  key={step}
                  className="px-4 py-3 rounded-full text-sm font-bold flex items-center gap-2"
                  style={{
                    background: done || active ? 'rgba(45,90,39,0.10)' : 'rgba(17,17,17,0.05)',
                    color: done || active ? '#2D5A27' : '#444444',
                    border: `1px solid ${done || active ? 'rgba(45,90,39,0.18)' : 'rgba(17,17,17,0.08)'}`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                >
                  {done && <Check className="w-4 h-4" strokeWidth={2.5} />}
                  {step}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
