import { motion } from 'framer-motion';
import { Satellite, CheckCircle } from 'lucide-react';
import type { NPKResult } from '../../types';
import { staggerContainer, staggerItem } from '../../animations/variants';
import { getActionPlansForResult } from '../../data/actionPlans';
import NutrientDial from './NutrientDial';
import SeverityCard from './SeverityCard';
import ActionPlanCard from './ActionPlanCard';
import YieldImpactCard from './YieldImpactCard';
import { Button } from '../ui/button'; // Assuming you have a button component

interface Props {
  result: NPKResult;
  onNASAContext?: () => void;
}

export default function ResultsView({ result, onNASAContext }: Props) {
  const allOptimal = result.nitrogen.level === 'optimal'
    && result.phosphorus.level === 'optimal'
    && result.potassium.level === 'optimal';

  const deficiencies = (
    ['nitrogen', 'phosphorus', 'potassium'] as const
  )
    .filter((n) => result[n].level !== 'optimal')
    .map((n) => ({ nutrient: n, severity: result.severity }));

  const actionPlans = deficiencies.length > 0
    ? getActionPlansForResult(deficiencies)
    : [];

  const visiblePlans = actionPlans.slice(0, 2);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col bg-[#0a0a0a]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4">
        {/* Header */}
        <motion.div variants={staggerItem} className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">Analysis Complete</h2>
          <p className="text-sm text-white/60 mt-1">Zone A3 · Leaf tissue spectral analysis</p>
        </motion.div>

        {/* Nutrient dials row */}
        <motion.div variants={staggerItem} className="flex justify-center gap-5 mb-6">
          <NutrientDial
            nutrient="nitrogen"
            confidence={result.nitrogen.confidence}
            level={result.nitrogen.level}
            color="var(--color-nitrogen)"
            delay={0.2}
          />
          <NutrientDial
            nutrient="phosphorus"
            confidence={result.phosphorus.confidence}
            level={result.phosphorus.level}
            color="var(--color-phosphorus)"
            delay={0.6}
          />
          <NutrientDial
            nutrient="potassium"
            confidence={result.potassium.confidence}
            level={result.potassium.level}
            color="var(--color-potassium)"
            delay={1.0}
          />
        </motion.div>

        {/* Severity card */}
        <motion.div variants={staggerItem} className="mb-4">
          <SeverityCard severity={result.severity} allOptimal={allOptimal} delay={1.4} />
        </motion.div>

        {/* Action plan cards */}
        <motion.div variants={staggerItem} className="mb-4">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">
            {allOptimal ? 'Assessment' : 'Recommended Actions'}
          </h3>
          {allOptimal ? (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-900/50 border border-green-500/30">
              <div className="p-1.5 rounded-full bg-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Healthy — No Action Needed</p>
                <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
                  All nutrient levels are within optimal range. Continue current management practices.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {visiblePlans.map((plan, i) => (
                <ActionPlanCard key={plan.id} plan={plan} delay={1.8 + i * 0.25} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Yield impact card — only show if there's a deficiency */}
        {!allOptimal && (
          <motion.div variants={staggerItem} className="mb-4">
            <YieldImpactCard result={result} delay={2.4} />
          </motion.div>
        )}
      </div>

      {/* Bottom CTAs — pinned, always visible */}
      <div className="shrink-0 px-4 pb-6 pt-2">
        {onNASAContext && (
          <motion.div variants={staggerItem}>
            <Button
              onClick={onNASAContext}
              className="w-full"
              size="lg"
            >
              <Satellite className="w-4 h-4 mr-2" />
              See NASA Climate Context
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
