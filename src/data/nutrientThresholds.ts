// Real NPK deficiency thresholds from published agricultural extension data
// Sources:
//   - Texas A&M AgriLife Extension (soil.tamu.edu)
//   - USDA NRCS Nutrient Management Technical Note (2019)
//   - Marschner's Mineral Nutrition of Higher Plants, 3rd Edition

import type { NutrientType, SeverityLevel } from '../types';

// Leaf tissue nutrient sufficiency ranges (% dry weight)
// Source: Mills & Jones (1996), Plant Analysis Handbook II
export const leafTissueRanges: Record<string, Record<NutrientType, { deficient: number; adequate: [number, number]; optimal: [number, number] }>> = {
  corn: {
    nitrogen: { deficient: 2.5, adequate: [2.5, 3.0], optimal: [3.0, 3.5] },
    phosphorus: { deficient: 0.2, adequate: [0.2, 0.3], optimal: [0.3, 0.5] },
    potassium: { deficient: 1.5, adequate: [1.5, 2.0], optimal: [2.0, 3.0] },
  },
  wheat: {
    nitrogen: { deficient: 2.0, adequate: [2.0, 3.0], optimal: [3.0, 4.0] },
    phosphorus: { deficient: 0.2, adequate: [0.2, 0.4], optimal: [0.4, 0.6] },
    potassium: { deficient: 1.5, adequate: [1.5, 2.5], optimal: [2.5, 3.5] },
  },
  rice: {
    nitrogen: { deficient: 2.5, adequate: [2.5, 3.5], optimal: [3.5, 4.5] },
    phosphorus: { deficient: 0.15, adequate: [0.15, 0.25], optimal: [0.25, 0.4] },
    potassium: { deficient: 1.2, adequate: [1.2, 1.8], optimal: [1.8, 2.5] },
  },
  soybean: {
    nitrogen: { deficient: 4.0, adequate: [4.0, 5.0], optimal: [5.0, 5.5] },
    phosphorus: { deficient: 0.25, adequate: [0.25, 0.5], optimal: [0.5, 0.8] },
    potassium: { deficient: 1.7, adequate: [1.7, 2.5], optimal: [2.5, 3.5] },
  },
};

// Yield impact estimates from published field trial data
// Source: IPNI (International Plant Nutrition Institute) research summaries
export const yieldImpactByDeficiency: Record<NutrientType, Record<SeverityLevel, { lossPercent: number; recoverablePercent: number }>> = {
  nitrogen: {
    low: { lossPercent: 8, recoverablePercent: 95 },
    moderate: { lossPercent: 22, recoverablePercent: 80 },
    severe: { lossPercent: 40, recoverablePercent: 55 },
  },
  phosphorus: {
    low: { lossPercent: 5, recoverablePercent: 90 },
    moderate: { lossPercent: 15, recoverablePercent: 70 },
    severe: { lossPercent: 30, recoverablePercent: 45 },
  },
  potassium: {
    low: { lossPercent: 6, recoverablePercent: 92 },
    moderate: { lossPercent: 18, recoverablePercent: 75 },
    severe: { lossPercent: 35, recoverablePercent: 50 },
  },
};

// Visual symptom thresholds for vegetation indices
// Source: Woebbecke et al. (1995), Meyer & Neto (2008)
export const vegetationIndexThresholds = {
  nitrogen: {
    // Low ExG + low NGRDI = yellowing = N deficiency
    exgDeficient: 0.15,     // ExG below this suggests N stress
    ngrdiDeficient: -0.1,   // NGRDI below this is chlorosis
  },
  phosphorus: {
    // High blue ratio = purpling = P deficiency
    blueRatioDeficient: 0.38, // B/(R+G+B) above this
  },
  potassium: {
    // Low VARI + low saturation = browning = K deficiency
    variDeficient: 0.0,      // VARI below this
    saturationDeficient: 0.3, // HSV saturation below this
  },
};
