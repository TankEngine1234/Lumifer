import { motion } from 'framer-motion';
import { Satellite } from 'lucide-react';
import type { NPKResult } from '../../types';
import { staggerContainer, staggerItem } from '../../animations/variants';
import { springDefault } from '../../animations/springs';
import { getActionPlansForResult } from '../../data/actionPlans';
import NutrientDial from './NutrientDial';
import SeverityCard from './SeverityCard';
import ActionPlanCard from './ActionPlanCard';
import YieldImpactCard from './YieldImpactCard';

interface Props {
  result: NPKResult;
  onNASAContext?: () => void;
}

export default function ResultsView({ result, onNASAContext }: Props) {
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

  // Show at most 2 action plans so everything fits
  const visiblePlans = actionPlans.slice(0, 2);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 pt-12 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Header */}
        <motion.div variants={staggerItem} className="text-center mb-4">
          <h2 className="text-lg font-semibold text-white">Analysis Complete</h2>
          <p className="text-xs text-white/40 mt-0.5">Zone A3 · Leaf tissue spectral analysis</p>
        </motion.div>

        {/* Nutrient dials row */}
        <motion.div variants={staggerItem} className="flex justify-center gap-4 mb-4">
          <NutrientDial
            nutrient="nitrogen"
            confidence={result.nitrogen.confidence}
            level={result.nitrogen.level}
            color={result.nitrogen.level === 'deficient' ? '#f87171' : '#4ade80'}
            delay={0.2}
          />
          <NutrientDial
            nutrient="phosphorus"
            confidence={result.phosphorus.confidence}
            level={result.phosphorus.level}
            color={result.phosphorus.level === 'deficient' ? '#f87171' : '#60a5fa'}
            delay={0.6}
          />
          <NutrientDial
            nutrient="potassium"
            confidence={result.potassium.confidence}
            level={result.potassium.level}
            color={result.potassium.level === 'deficient' ? '#f87171' : '#fb923c'}
            delay={1.0}
          />
        </motion.div>

        {/* Severity card */}
        <motion.div variants={staggerItem} className="mb-3">
          <SeverityCard severity={result.severity} delay={1.4} />
        </motion.div>

        {/* Action plan cards */}
        <motion.div variants={staggerItem} className="mb-3">
          <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-[0.15em] mb-2 px-0.5">
            Recommended Actions
          </h3>
          <div className="space-y-2">
            {visiblePlans.map((plan, i) => (
              <ActionPlanCard key={plan.id} plan={plan} delay={1.8 + i * 0.25} />
            ))}
          </div>
        </motion.div>

        {/* Yield impact card */}
        <motion.div variants={staggerItem} className="mb-3">
          <YieldImpactCard result={result} delay={2.4} />
        </motion.div>
      </div>

      {/* NASA context CTA — pinned to bottom, always visible */}
      {onNASAContext && (
        <div className="shrink-0 px-4 pb-6 pt-2">
          <motion.button
            variants={staggerItem}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold"
            style={{
              background: 'rgba(11,61,145,0.45)',
              border: '1px solid rgba(96,165,250,0.35)',
              color: '#93c5fd',
            }}
            whileTap={{ scale: 0.97 }}
            transition={springDefault}
            onClick={onNASAContext}
          >
            <Satellite className="w-4 h-4" />
            See NASA Climate Context
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
