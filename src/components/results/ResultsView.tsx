import { motion } from 'framer-motion';
import type { NPKResult } from '../../types';
import { staggerContainer, staggerItem } from '../../animations/variants';
import { getActionPlansForResult } from '../../data/actionPlans';
import NutrientDial from './NutrientDial';
import SeverityCard from './SeverityCard';
import ActionPlanCard from './ActionPlanCard';
import YieldImpactCard from './YieldImpactCard';

interface Props {
  result: NPKResult;
}

export default function ResultsView({ result }: Props) {
  // Determine which nutrients are deficient for action plans
  const deficiencies = (
    ['nitrogen', 'phosphorus', 'potassium'] as const
  )
    .filter((n) => result[n].level === 'deficient')
    .map((n) => ({ nutrient: n, severity: result.severity }));

  const actionPlans = getActionPlansForResult(
    deficiencies.length > 0
      ? deficiencies
      : [{ nutrient: 'nitrogen', severity: result.severity }]
  );

  return (
    <motion.div
      className="h-full w-full overflow-y-auto pb-24 pt-14 px-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="text-center mb-6">
        <h2 className="text-lg font-semibold text-white">Analysis Complete</h2>
        <p className="text-xs text-white/40 mt-1">Zone A3 — Leaf tissue spectral analysis</p>
      </motion.div>

      {/* Nutrient dials row */}
      <motion.div variants={staggerItem} className="flex justify-center gap-6 mb-6">
        <NutrientDial
          nutrient="nitrogen"
          confidence={result.nitrogen.confidence}
          level={result.nitrogen.level}
          color="#EAB308"
          delay={0.2}
        />
        <NutrientDial
          nutrient="phosphorus"
          confidence={result.phosphorus.confidence}
          level={result.phosphorus.level}
          color="#A855F7"
          delay={0.6}
        />
        <NutrientDial
          nutrient="potassium"
          confidence={result.potassium.confidence}
          level={result.potassium.level}
          color="#F59E0B"
          delay={1.0}
        />
      </motion.div>

      {/* Severity card */}
      <motion.div variants={staggerItem} className="mb-4">
        <SeverityCard severity={result.severity} delay={1.4} />
      </motion.div>

      {/* Action plan cards */}
      <motion.div variants={staggerItem} className="mb-4">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 px-1">
          Recommended Actions
        </h3>
        <div className="space-y-3">
          {actionPlans.map((plan, i) => (
            <ActionPlanCard key={plan.id} plan={plan} delay={1.8 + i * 0.3} />
          ))}
        </div>
      </motion.div>

      {/* Yield impact card */}
      <motion.div variants={staggerItem}>
        <YieldImpactCard result={result} delay={2.5} />
      </motion.div>
    </motion.div>
  );
}
