import { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import type { NPKResult, VegetationIndices, ColorData, SeverityLevel } from '../types';
import { loadNPKModel, predict } from '../models/loadModel';
import { fallbackPredict } from '../models/fallbackInference';
import { yieldImpactByDeficiency } from '../data/nutrientThresholds';

export function useInference() {
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load model on mount
  useEffect(() => {
    loadNPKModel()
      .then((m) => {
        setModel(m);
        setIsModelReady(true);
      })
      .catch((err) => {
        console.warn('[Lumifer] Using fallback inference:', err);
        setUseFallback(true);
        setIsModelReady(true); // Still ready — using fallback
        setError('Model unavailable, using heuristic inference');
      });
  }, []);

  const runInference = useCallback(
    async (
      tensor: tf.Tensor4D | null,
      indices: VegetationIndices,
      colorData: ColorData
    ): Promise<NPKResult> => {
      // Fallback path: use heuristic inference
      if (useFallback || !model || !tensor) {
        return fallbackPredict(indices, colorData);
      }

      // Primary path: use trained model
      try {
        const [nConf, pConf, kConf] = await predict(model, tensor);

        const getLevel = (conf: number) =>
          conf > 0.5 ? 'deficient' as const : conf > 0.2 ? 'adequate' as const : 'optimal' as const;

        const maxConf = Math.max(nConf, pConf, kConf);
        const severity: SeverityLevel = maxConf > 0.7 ? 'severe' : maxConf > 0.4 ? 'moderate' : 'low';

        const dominantNutrient = nConf >= pConf && nConf >= kConf ? 'nitrogen' :
          pConf >= kConf ? 'phosphorus' : 'potassium';
        const yieldImpact = yieldImpactByDeficiency[dominantNutrient][severity].lossPercent;

        return {
          nitrogen: { confidence: nConf, level: getLevel(nConf) },
          phosphorus: { confidence: pConf, level: getLevel(pConf) },
          potassium: { confidence: kConf, level: getLevel(kConf) },
          severity,
          yieldImpact,
        };
      } catch (err) {
        console.error('[Lumifer] Model inference failed, using fallback:', err);
        return fallbackPredict(indices, colorData);
      }
    },
    [model, useFallback]
  );

  return { isModelReady, runInference, error };
}
