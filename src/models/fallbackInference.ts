// Heuristic safety net — only used if TF.js model fails to load
// Uses real agronomic thresholds from published research:
//   - Woebbecke et al. (1995) for ExG thresholds
//   - Meyer & Neto (2008) for NGRDI correlation with chlorophyll
//   - Gitelson et al. (2002) for VARI interpretation

import type { VegetationIndices, ColorData, NPKResult, SeverityLevel } from '../types';
import { vegetationIndexThresholds, yieldImpactByDeficiency } from '../data/nutrientThresholds';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function fallbackPredict(indices: VegetationIndices, colorData: ColorData): NPKResult {
  const { exg, ngrdi, vari } = indices;
  const { meanRGB, meanHSV } = colorData;
  const thresholds = vegetationIndexThresholds;

  // === Nitrogen deficiency ===
  // Low ExG + low NGRDI = yellowing = chlorophyll degradation = N deficiency
  let nConf = 0;
  if (exg < thresholds.nitrogen.exgDeficient) {
    nConf += 0.4 * (1 - exg / thresholds.nitrogen.exgDeficient);
  }
  if (ngrdi < thresholds.nitrogen.ngrdiDeficient) {
    nConf += 0.4 * (1 - ngrdi / thresholds.nitrogen.ngrdiDeficient);
  }
  // Yellow hue (H 40-60) boosts N-deficiency confidence
  if (meanHSV.h > 40 && meanHSV.h < 65) {
    nConf += 0.2;
  }
  nConf = clamp(nConf, 0, 1);

  // === Phosphorus deficiency ===
  // High blue ratio = anthocyanin accumulation = P deficiency
  const blueRatio = meanRGB.b / (meanRGB.r + meanRGB.g + meanRGB.b + 1);
  let pConf = 0;
  if (blueRatio > thresholds.phosphorus.blueRatioDeficient) {
    pConf += 0.5 * ((blueRatio - thresholds.phosphorus.blueRatioDeficient) / 0.15);
  }
  // Purple/red hue (H 280-340) boosts P-deficiency confidence
  if (meanHSV.h > 280 || meanHSV.h < 20) {
    pConf += 0.3;
  }
  pConf = clamp(pConf, 0, 1);

  // === Potassium deficiency ===
  // Low VARI + low saturation = browning edges = K deficiency
  let kConf = 0;
  if (vari < thresholds.potassium.variDeficient) {
    kConf += 0.4 * (1 - vari / thresholds.potassium.variDeficient);
  }
  if (meanHSV.s < thresholds.potassium.saturationDeficient) {
    kConf += 0.3 * (1 - meanHSV.s / thresholds.potassium.saturationDeficient);
  }
  // Brown hue (H 20-50) boosts K-deficiency confidence
  if (meanHSV.h > 20 && meanHSV.h < 50) {
    kConf += 0.2;
  }
  kConf = clamp(kConf, 0, 1);

  // Determine levels
  const getLevel = (conf: number) =>
    conf > 0.5 ? 'deficient' as const : conf > 0.2 ? 'adequate' as const : 'optimal' as const;

  // Determine overall severity based on worst deficiency
  const maxConf = Math.max(nConf, pConf, kConf);
  const severity: SeverityLevel = maxConf > 0.7 ? 'severe' : maxConf > 0.4 ? 'moderate' : 'low';

  // Estimate yield impact from the dominant deficiency
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
