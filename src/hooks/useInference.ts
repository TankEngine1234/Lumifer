import { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import type { NPKResult, VegetationIndices, ColorData, SeverityLevel } from '../types';
import { loadNPKModel, predict } from '../models/loadModel';
import { fallbackPredict } from '../models/fallbackInference';
import { yieldImpactByDeficiency } from '../data/nutrientThresholds';

/**
 * Fuse model predictions with physics-based color index predictions.
 *
 * Strategy: color indices are the foundation (domain-invariant, interpretable),
 * model adjusts when it has strong signal. This avoids two failure modes:
 *   1. Model false-positives on healthy leaves (PlantVillage distribution shift)
 *   2. Model false-negatives on dead/brown tissue (out-of-distribution)
 */
function fuseConfidences(
  modelConfs: [number, number, number],
  indexConfs: [number, number, number],
): [number, number, number] {
  return modelConfs.map((modelC, i) => {
    const indexC = indexConfs[i];

    // Both agree on deficiency → boost (high confidence)
    if (modelC > 0.4 && indexC > 0.3) {
      return Math.min((modelC + indexC) / 1.5, 1.0);
    }

    // Both agree on healthy → stay low
    if (modelC < 0.2 && indexC < 0.2) {
      return Math.min(modelC, indexC);
    }

    // Disagreement → weighted average, favor indices (0.6) over model (0.4)
    // because indices are physics-based and model has distribution shift issues
    return indexC * 0.6 + modelC * 0.4;
  }) as [number, number, number];
}

export function useInference() {
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNPKModel()
      .then((m) => {
        setModel(m);
        setIsModelReady(true);
      })
      .catch((err) => {
        console.warn('[Lumifer] Using fallback inference:', err);
        setUseFallback(true);
        setIsModelReady(true);
        setError('Model unavailable, using heuristic inference');
      });
  }, []);

  const runInference = useCallback(
    async (
      tensor: tf.Tensor4D | null,
      indices: VegetationIndices,
      colorData: ColorData
    ): Promise<NPKResult> => {

      try {
        // Always compute the physics-based index predictions first
        const fb = fallbackPredict(indices, colorData);
        console.log('[Lumifer] 🌿 Index-based predictions:', {
          N: fb.nitrogen.confidence.toFixed(4),
          P: fb.phosphorus.confidence.toFixed(4),
          K: fb.potassium.confidence.toFixed(4),
        });

        let nConf: number, pConf: number, kConf: number;

        if (useFallback || !model || !tensor) {
          console.log('[Lumifer] ⚠️ FALLBACK only (no model)', { useFallback, hasModel: !!model, hasTensor: !!tensor });
          return fb;
        }

        // Get raw model predictions
        const rawOutputs = await predict(model, tensor);
        const [rawN, rawP, rawK] = rawOutputs;
        console.log('[Lumifer] 🧠 Raw model sigmoid:', { N: rawN.toFixed(4), P: rawP.toFixed(4), K: rawK.toFixed(4) });

        // Fuse model + index predictions
        [nConf, pConf, kConf] = fuseConfidences(
          [rawN, rawP, rawK],
          [fb.nitrogen.confidence, fb.phosphorus.confidence, fb.potassium.confidence],
        );

        console.log('[Lumifer] Fused confidences:', {
          N: nConf.toFixed(4), P: pConf.toFixed(4), K: kConf.toFixed(4),
        });

        const getLevel = (conf: number) =>
          conf > 0.5 ? 'deficient' as const : conf > 0.2 ? 'adequate' as const : 'optimal' as const;

        const maxConf = Math.max(nConf, pConf, kConf);
        const severity: SeverityLevel = maxConf > 0.7 ? 'severe' : maxConf > 0.4 ? 'moderate' : 'low';

        const dominantNutrient = nConf >= pConf && nConf >= kConf ? 'nitrogen' :
          pConf >= kConf ? 'phosphorus' : 'potassium';

        const yieldImpact = yieldImpactByDeficiency[dominantNutrient][severity].lossPercent;

        const result = {
          nitrogen: { confidence: nConf, level: getLevel(nConf) },
          phosphorus: { confidence: pConf, level: getLevel(pConf) },
          potassium: { confidence: kConf, level: getLevel(kConf) },
          severity,
          yieldImpact,
        };
        console.log('[Lumifer] Final NPK result:', result);
        return result;
      } catch (err) {
        console.error('[Lumifer] Model inference failed, using fallback:', err);
        return fallbackPredict(indices, colorData);
      } finally {
        if (tensor) {
          tensor.dispose();
        }
      }
    },
    [model, useFallback]
  );

  return { isModelReady, runInference, error, useFallback };
}
