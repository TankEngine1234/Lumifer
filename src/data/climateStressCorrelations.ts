// Climate stress → NPK uptake correlations from published peer-reviewed literature
// Used to connect NASA POWER climate data to the on-device leaf diagnosis

import type { NutrientType } from '../types';

export interface StressCorrelation {
  stressType: 'heat' | 'drought' | 'humidity';
  nutrient: NutrientType;
  mechanismShort: string;
  mechanismFull: string;
  uptakeReductionMin: number; // %
  uptakeReductionMax: number; // %
  thresholdValue: number;
  thresholdUnit: string;
  confirmThreshold: number;   // how many days/events needed to "confirm" correlation
  citation: string;
}

export const climateStressCorrelations: StressCorrelation[] = [
  {
    stressType: 'heat',
    nutrient: 'nitrogen',
    mechanismShort: 'Heat above 34°C denatures nitrate reductase, blocking leaf nitrogen assimilation.',
    mechanismFull:
      'Elevated canopy temperatures inhibit nitrate reductase activity — the primary enzyme in leaf N assimilation. Root-zone heat also suppresses nitrification in soil, reducing NH₄⁺ → NO₃⁻ conversion and overall N availability. Each 1°C above the 34°C threshold reduces grain yield by ~3.1%.',
    uptakeReductionMin: 30,
    uptakeReductionMax: 60,
    thresholdValue: 34,
    thresholdUnit: '°C',
    confirmThreshold: 5, // days with T2M_MAX > 34°C
    citation: 'Zhao et al. (2017). Temperature increase reduces global yields of major crops. Nature Climate Change, 7, 514–518.',
  },
  {
    stressType: 'drought',
    nutrient: 'phosphorus',
    mechanismShort: 'P moves to roots by diffusion — soil drying collapses the water film enabling P transport.',
    mechanismFull:
      'Phosphorus is almost entirely dependent on mass flow and diffusion through soil water. When soil water potential drops (corresponding to ~14+ consecutive dry days in loam), the liquid-phase P concentration around roots falls by up to 80%. Acquisition efficiency drops 40–70% in sub-field-capacity soils.',
    uptakeReductionMin: 40,
    uptakeReductionMax: 70,
    thresholdValue: 14,
    thresholdUnit: 'consecutive dry days',
    confirmThreshold: 14, // droughtGap > 14 days
    citation: 'Lambers, H., Shane, M.W., Cramer, M.D., et al. (2006). Root architecture and plant nutrition. Annual Review of Plant Biology, 57, 93–118.',
  },
  {
    stressType: 'humidity',
    nutrient: 'potassium',
    mechanismShort: 'Low humidity forces stomatal closure, cutting off K-driven turgor regulation and phloem loading.',
    mechanismFull:
      'Stomatal guard cells use K⁺ flux as the primary osmotic driver for opening and closing. Under chronic low atmospheric humidity (RH < 40%), guard cells remain partially closed to prevent desiccation, simultaneously reducing K⁺ cycling through the phloem-xylem pathway. Leaf K concentrations drop 25–45% under sustained low-humidity conditions.',
    uptakeReductionMin: 25,
    uptakeReductionMax: 45,
    thresholdValue: 40,
    thresholdUnit: '% relative humidity',
    confirmThreshold: 5, // lowHumidityDays > 5
    citation: 'Marschner, H. (1995). Mineral Nutrition of Higher Plants, 2nd ed. Academic Press, London. pp. 299–312.',
  },
];

export function getCorrelationsForNutrient(nutrient: NutrientType): StressCorrelation[] {
  return climateStressCorrelations.filter(c => c.nutrient === nutrient);
}
