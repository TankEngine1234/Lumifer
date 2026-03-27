// Real fertilizer recommendations from agricultural extension services
// Sources:
//   - Texas A&M AgriLife Extension Service (SCS-2005-09)
//   - USDA NRCS Practice Standard 590 — Nutrient Management
//   - International Fertilizer Association (IFA) guidelines

import type { ActionPlan, NutrientType, SeverityLevel } from '../types';

const plans: Record<NutrientType, Record<SeverityLevel, ActionPlan>> = {
  nitrogen: {
    low: {
      id: 'n-low',
      nutrient: 'nitrogen',
      severity: 'low',
      title: 'Light Nitrogen Supplementation',
      description: 'Apply calcium ammonium nitrate (27-0-0) as side-dress. Split application recommended: 60% at V6 stage, 40% at V10.',
      rate: '80–100 kg N/ha',
      timing: 'Within 7 days, before next growth stage',
      icon: 'Droplets',
    },
    moderate: {
      id: 'n-mod',
      nutrient: 'nitrogen',
      severity: 'moderate',
      title: 'Nitrogen Recovery Application',
      description: 'Apply urea (46-0-0) with urease inhibitor (NBPT) to minimize volatilization. Consider foliar urea spray (2–3% solution) for rapid uptake.',
      rate: '120–150 kg N/ha',
      timing: 'Immediate — apply within 3 days',
      icon: 'AlertTriangle',
    },
    severe: {
      id: 'n-sev',
      nutrient: 'nitrogen',
      severity: 'severe',
      title: 'Emergency Nitrogen Rescue',
      description: 'Dual application: soil-applied UAN-32 (32-0-0) solution via fertigation plus foliar urea spray (5% solution). Critical yield window — every day of delay reduces recovery potential.',
      rate: '150–200 kg N/ha split application',
      timing: 'Urgent — same day application',
      icon: 'Siren',
    },
  },
  phosphorus: {
    low: {
      id: 'p-low',
      nutrient: 'phosphorus',
      severity: 'low',
      title: 'Phosphorus Maintenance',
      description: 'Apply monoammonium phosphate (MAP, 11-52-0) as band placement near root zone. Phosphorus is immobile in soil — placement matters more than rate.',
      rate: '30–40 kg P₂O₅/ha',
      timing: 'At next cultivation opportunity',
      icon: 'Droplets',
    },
    moderate: {
      id: 'p-mod',
      nutrient: 'phosphorus',
      severity: 'moderate',
      title: 'Phosphorus Corrective Application',
      description: 'Apply triple superphosphate (TSP, 0-46-0) banded 5cm deep beside plant rows. Supplement with foliar phosphoric acid spray (0.5% H₃PO₄) for immediate uptake.',
      rate: '50–70 kg P₂O₅/ha',
      timing: 'Within 5 days — early intervention critical',
      icon: 'AlertTriangle',
    },
    severe: {
      id: 'p-sev',
      nutrient: 'phosphorus',
      severity: 'severe',
      title: 'Phosphorus Emergency Protocol',
      description: 'Soil-applied DAP (18-46-0) at high rate plus repeated foliar phosphite (0-28-26) applications at 7-day intervals. Note: severe P deficiency has limited mid-season recovery potential.',
      rate: '80–100 kg P₂O₅/ha + foliar',
      timing: 'Urgent — begin immediately',
      icon: 'Siren',
    },
  },
  potassium: {
    low: {
      id: 'k-low',
      nutrient: 'potassium',
      severity: 'low',
      title: 'Potassium Supplementation',
      description: 'Apply muriate of potash (MOP, 0-0-60) broadcast and incorporated. Potassium is relatively mobile in sandy soils — consider split application on light-textured soils.',
      rate: '60–80 kg K₂O/ha',
      timing: 'Within 10 days',
      icon: 'Droplets',
    },
    moderate: {
      id: 'k-mod',
      nutrient: 'potassium',
      severity: 'moderate',
      title: 'Potassium Recovery Treatment',
      description: 'Apply sulfate of potash (SOP, 0-0-50) banded near root zone. SOP preferred over MOP for sensitive crops. Supplement with foliar potassium nitrate (KNO₃, 2% solution).',
      rate: '100–130 kg K₂O/ha',
      timing: 'Within 5 days',
      icon: 'AlertTriangle',
    },
    severe: {
      id: 'k-sev',
      nutrient: 'potassium',
      severity: 'severe',
      title: 'Potassium Emergency Application',
      description: 'High-rate SOP soil application plus weekly foliar KNO₃ sprays (3% solution). Monitor for secondary magnesium deficiency as high K can induce Mg antagonism.',
      rate: '150–180 kg K₂O/ha + foliar',
      timing: 'Urgent — same day',
      icon: 'Siren',
    },
  },
};

export function getActionPlan(nutrient: NutrientType, severity: SeverityLevel): ActionPlan {
  return plans[nutrient][severity];
}

export function getActionPlansForResult(
  deficiencies: { nutrient: NutrientType; severity: SeverityLevel }[]
): ActionPlan[] {
  return deficiencies.map(d => getActionPlan(d.nutrient, d.severity));
}
