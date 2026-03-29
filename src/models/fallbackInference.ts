// Heuristic inference engine — uses agronomic color indices + per-pixel symptom fractions
// References:
//   - Woebbecke et al. (1995) for ExG thresholds
//   - Meyer & Neto (2008) for NGRDI correlation with chlorophyll
//   - Gitelson et al. (2002) for VARI interpretation

import type { VegetationIndices, ColorData, NPKResult, SeverityLevel } from '../types';
import { yieldImpactByDeficiency } from '../data/nutrientThresholds';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function fallbackPredict(indices: VegetationIndices, colorData: ColorData): NPKResult {
  const { exg, ngrdi, vari } = indices;
  const { meanHSV, purpleFrac, brownFrac, yellowFrac } = colorData;

  // === Nitrogen deficiency ===
  // Chlorosis (yellowing) = chlorophyll loss = N depletion
  let nConf = 0;

  // ExG-based: low excess green means less chlorophyll
  if (exg < 0.15) {
    nConf += 0.35 * clamp((0.15 - exg) / 0.15, 0, 1.2);
  }
  // NGRDI-based: negative = more red than green
  if (ngrdi < -0.05) {
    nConf += 0.3 * clamp((-0.05 - ngrdi) / 0.15, 0, 1.2);
  }
  // Per-pixel yellow fraction: direct chlorosis indicator
  if (yellowFrac > 0.1) {
    nConf += 0.35 * clamp(yellowFrac / 0.4, 0, 1);
  }
  // Brown tissue also implies N loss (dead = no chlorophyll)
  if (brownFrac > 0.3) {
    nConf += 0.25 * clamp(brownFrac / 0.5, 0, 1);
  }
  nConf = clamp(nConf, 0, 1);

  // === Phosphorus deficiency ===
  // Anthocyanin accumulation → purple/reddish discoloration
  let pConf = 0;

  // Per-pixel purple fraction: direct P-deficiency indicator
  // Even 15% purple pixels on a leaf is significant
  if (purpleFrac > 0.08) {
    pConf += 0.6 * clamp(purpleFrac / 0.3, 0, 1);
  }
  // Mean blue ratio as backup
  const blueRatio = colorData.meanRGB.b / (colorData.meanRGB.r + colorData.meanRGB.g + colorData.meanRGB.b + 1);
  if (blueRatio > 0.35) {
    pConf += 0.3 * clamp((blueRatio - 0.35) / 0.1, 0, 1);
  }
  // Purple hue range
  if (meanHSV.h > 260 || meanHSV.h < 20) {
    pConf += 0.15;
  }
  pConf = clamp(pConf, 0, 1);

  // === Potassium deficiency ===
  // Necrosis (browning, especially margins) = K starvation
  let kConf = 0;

  // Per-pixel brown fraction: direct necrosis indicator
  if (brownFrac > 0.1) {
    kConf += 0.5 * clamp(brownFrac / 0.35, 0, 1);
  }
  // Negative VARI = more red than green = dying tissue
  if (vari < 0.05) {
    kConf += 0.3 * clamp((0.05 - vari) / 0.15, 0, 1.2);
  }
  // Low saturation = desaturated brown/tan
  if (meanHSV.s < 0.45) {
    kConf += 0.2 * clamp((0.45 - meanHSV.s) / 0.25, 0, 1);
  }
  kConf = clamp(kConf, 0, 1);

  // Determine levels
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
}
