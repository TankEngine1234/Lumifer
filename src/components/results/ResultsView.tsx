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

const nutrientTone = {
  nitrogen: { healthy: '#2D5A27', deficient: '#111111' },
  phosphorus: { healthy: '#4A7A44', deficient: '#111111' },
  potassium: { healthy: '#6B9165', deficient: '#111111' },
};

export default function ResultsView({ result, onNASAContext }: Props) {
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
      className="app-page"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={staggerItem} className="page-header">
        <p className="page-header-kicker">Spectral Analysis</p>
        <h2 className="page-header-title">Analysis Complete</h2>
        <p className="page-header-copy" style={{ marginTop: 8 }}>
          Zone A3 • Leaf tissue spectral analysis
        </p>
      </motion.div>

      <div className="page-content flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
        <div className="app-section">
          <motion.div variants={staggerItem} className="app-card p-5">
            <p className="section-label mb-4">Nutrient Confidence</p>
            <div className="flex justify-center gap-4">
              <NutrientDial
                nutrient="nitrogen"
                confidence={result.nitrogen.confidence}
                level={result.nitrogen.level}
                color={result.nitrogen.level === 'deficient' ? nutrientTone.nitrogen.deficient : nutrientTone.nitrogen.healthy}
                delay={0.2}
              />
              <NutrientDial
                nutrient="phosphorus"
                confidence={result.phosphorus.confidence}
                level={result.phosphorus.level}
                color={result.phosphorus.level === 'deficient' ? nutrientTone.phosphorus.deficient : nutrientTone.phosphorus.healthy}
                delay={0.6}
              />
              <NutrientDial
                nutrient="potassium"
                confidence={result.potassium.confidence}
                level={result.potassium.level}
                color={result.potassium.level === 'deficient' ? nutrientTone.potassium.deficient : nutrientTone.potassium.healthy}
                delay={1.0}
              />
            </div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <SeverityCard severity={result.severity} delay={1.4} />
          </motion.div>

          <motion.div variants={staggerItem}>
            <div className="mb-2 px-1">
              <h3 className="section-label">Recommended Actions</h3>
            </div>
            <div className="app-section">
              {visiblePlans.map((plan, i) => (
                <ActionPlanCard key={plan.id} plan={plan} delay={1.8 + i * 0.25} />
              ))}
            </div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <YieldImpactCard result={result} delay={2.4} />
          </motion.div>
        </div>
      </div>

      {onNASAContext && (
        <div className="page-content pt-0 pb-6" style={{ maxWidth: '100%' }}>
          <motion.button
            variants={staggerItem}
            className="app-button-primary app-button-cta"
            whileTap={{ scale: 0.98 }}
            transition={springDefault}
            onClick={onNASAContext}
          >
            <Satellite className="w-5 h-5" />
            See NASA Climate Context
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
