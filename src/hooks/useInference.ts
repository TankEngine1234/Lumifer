import { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import type { NPKResult, VegetationIndices, ColorData, SeverityLevel } from '../types';
import { loadNPKModel, predict } from '../models/loadModel';
import { fallbackPredict } from '../models/fallbackInference';
import { yieldImpactByDeficiency } from '../data/nutrientThresholds';

// Compute a "health score" from vegetation indices.
// A clearly healthy leaf (high ExG, positive NGRDI, positive VARI, high saturation)
// should pull all deficiency confidences down toward 0.
function computeHealthScore(indices: VegetationIndices, colorData: ColorData): number {
  const { exg, ngrdi, vari } = indices;
  const { meanHSV } = colorData;

  let score = 0;

  // ExG > 0.15 = strong green canopy
  if (exg > 0.15) score += 0.25;
  else if (exg > 0.08) score += 0.1;

  // NGRDI > 0.05 = more green than red
  if (ngrdi > 0.05) score += 0.25;
  else if (ngrdi > 0.0) score += 0.1;

  // VARI > 0.1 = healthy vegetation
  if (vari > 0.1) score += 0.25;
  else if (vari > 0.0) score += 0.1;

  // High saturation + green hue = healthy leaf
  if (meanHSV.s > 0.4 && meanHSV.h > 60 && meanHSV.h < 160) score += 0.25;
  else if (meanHSV.s > 0.3) score += 0.1;

  return Math.min(score, 1.0);
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
        // Compute physics-based health score from color indices
        const healthScore = computeHealthScore(indices, colorData);
        console.log(`[Lumifer] 🌿 Health score: ${healthScore.toFixed(2)} (1.0 = clearly healthy)`);

        let nConf: number, pConf: number, kConf: number;

        if (useFallback || !model || !tensor) {
          console.log('[Lumifer] ⚠️ FALLBACK inference', { useFallback, hasModel: !!model, hasTensor: !!tensor });
          const fb = fallbackPredict(indices, colorData);
          return fb;
        }

        // Get raw model predictions
        const rawOutputs = await predict(model, tensor);
        const [rawN, rawP, rawK] = rawOutputs;
        console.log('[Lumifer] 🧠 Raw model sigmoid:', { N: rawN.toFixed(4), P: rawP.toFixed(4), K: rawK.toFixed(4) });

        // Hybrid fusion: if color indices say "healthy", dampen model deficiency scores.
        // The model was trained on PlantVillage disease proxies and can false-positive
        // on healthy leaves. The color indices are physics-based and domain-invariant.
        //
        // healthScore 1.0 → multiply model outputs by 0.15 (strong override)
        // healthScore 0.5 → multiply by ~0.57
        // healthScore 0.0 → no dampening (trust model fully)
        const dampen = 1 - healthScore * 0.85;
        nConf = rawN * dampen;
        pConf = rawP * dampen;
        kConf = rawK * dampen;

        // Also get fallback scores — if fallback says deficient AND model agrees, boost
        const fb = fallbackPredict(indices, colorData);
        const fbN = fb.nitrogen.confidence;
        const fbP = fb.phosphorus.confidence;
        const fbK = fb.potassium.confidence;

        // Agreement boost: when both model and indices detect deficiency, trust it more
        if (fbN > 0.4 && rawN > 0.3) nConf = Math.max(nConf, (rawN + fbN) / 2);
        if (fbP > 0.4 && rawP > 0.3) pConf = Math.max(pConf, (rawP + fbP) / 2);
        if (fbK > 0.4 && rawK > 0.3) kConf = Math.max(kConf, (rawK + fbK) / 2);

        console.log('[Lumifer] Fused confidences:', {
          N: nConf.toFixed(4), P: pConf.toFixed(4), K: kConf.toFixed(4),
          dampen: dampen.toFixed(3),
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
