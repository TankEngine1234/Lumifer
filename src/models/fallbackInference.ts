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

  const telemetry: string[] = [];

  // === Nitrogen deficiency ===
  let nConf = 0;
  if (exg < thresholds.nitrogen.exgDeficient) {
    nConf += 0.4 * (1 - exg / thresholds.nitrogen.exgDeficient);
    telemetry.push(`[N-Stress] ExG dropped to ${exg.toFixed(2)} -> Indicating severe canopy chlorosis.`);
  }
  if (ngrdi < thresholds.nitrogen.ngrdiDeficient) {
    nConf += 0.4 * (1 - ngrdi / thresholds.nitrogen.ngrdiDeficient);
    telemetry.push(`[N-Stress] NGRDI dropped to ${ngrdi.toFixed(2)} -> Confirming visible-spectrum nitrogen starvation.`);
  }
  // 🚨 PATCHED: OpenCV Hue for Yellow (approx 20-32 instead of 40-65)
  if (meanHSV.h > 20 && meanHSV.h < 33) {
    nConf += 0.2;
    telemetry.push(`[N-Stress] Hue shift detected (${meanHSV.h.toFixed(0)}) -> Classic yellowing pattern match.`);
  }
  nConf = clamp(nConf, 0, 1);

  // === Phosphorus deficiency ===
  const blueRatio = meanRGB.b / (meanRGB.r + meanRGB.g + meanRGB.b + 1);
  let pConf = 0;
  if (blueRatio > thresholds.phosphorus.blueRatioDeficient) {
    pConf += 0.5 * ((blueRatio - thresholds.phosphorus.blueRatioDeficient) / 0.15);
    telemetry.push(`[P-Stress] Blue Ratio spiked to ${blueRatio.toFixed(2)} -> Indicating anthocyanin accumulation.`);
  }
  // 🚨 PATCHED: OpenCV Hue for Purple/Red (approx 140-179 or 0-10 instead of 280-340/0-20)
  if (meanHSV.h > 140 || meanHSV.h < 10) {
    pConf += 0.3;
    telemetry.push(`[P-Stress] Hue shift detected (${meanHSV.h.toFixed(0)}) -> Purple/red leaf margin pattern match.`);
  }
  pConf = clamp(pConf, 0, 1);

  // === Potassium deficiency ===
  let kConf = 0;
  if (vari < thresholds.potassium.variDeficient) {
    kConf += 0.4 * (1 - vari / thresholds.potassium.variDeficient);
    telemetry.push(`[K-Stress] VARI dropped to ${vari.toFixed(2)} -> Indicating structural margin damage.`);
  }
  if (meanHSV.s < thresholds.potassium.saturationDeficient) {
    kConf += 0.3 * (1 - meanHSV.s / thresholds.potassium.saturationDeficient);
    telemetry.push(`[K-Stress] Saturation dropped to ${meanHSV.s.toFixed(2)} -> Confirming edge necrosis (dead tissue).`);
  }
  // 🚨 PATCHED: OpenCV Hue for Brown (approx 10-25 instead of 20-50)
  if (meanHSV.h > 10 && meanHSV.h < 25) {
    kConf += 0.2;
    telemetry.push(`[K-Stress] Hue shift detected (${meanHSV.h.toFixed(0)}) -> Brown leaf margin pattern match.`);
  }
  kConf = clamp(kConf, 0, 1);

  // 💡 Output the Explainable AI Telemetry to the console
  if (telemetry.length > 0) {
    console.group('%c[Lumifer] Deterministic Inference Telemetry Activated', 'color: #EAB308; font-weight: bold;');
    telemetry.forEach(log => console.log(`%c${log}`, 'color: #A3E635;'));
    console.groupEnd();
  }

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
