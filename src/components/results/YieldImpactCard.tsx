import { motion, animate } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TrendingDown, ArrowUpRight } from 'lucide-react';
import type { NPKResult, NutrientType } from '../../types';
import { yieldImpactByDeficiency } from '../../data/nutrientThresholds';
import GlassCard from '../ui/GlassCard';

interface Props {
  result: NPKResult;
  delay?: number;
}

export default function YieldImpactCard({ result, delay = 0 }: Props) {
  const [displayLoss, setDisplayLoss] = useState(0);
  const [displayRecovery, setDisplayRecovery] = useState(0);

  const dominantNutrient: NutrientType =
    result.nitrogen.confidence >= result.phosphorus.confidence &&
    result.nitrogen.confidence >= result.potassium.confidence
      ? 'nitrogen'
      : result.phosphorus.confidence >= result.potassium.confidence
        ? 'phosphorus'
        : 'potassium';

  const recoverable = yieldImpactByDeficiency[dominantNutrient][result.severity].recoverablePercent;

  useEffect(() => {
    const lossAnim = animate(0, result.yieldImpact, {
      duration: 2,
      delay: delay + 0.3,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayLoss(Math.round(v)),
    });

    const recoveryAnim = animate(0, recoverable, {
      duration: 2,
      delay: delay + 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayRecovery(Math.round(v)),
    });

    return () => {
      lossAnim.stop();
      recoveryAnim.stop();
    };
  }, [result.yieldImpact, recoverable, delay]);

  return (
    <GlassCard delay={delay} className="!p-5">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center shrink-0">
          <TrendingDown className="w-4 h-4 mb-1" style={{ color: '#111111' }} />
          <motion.span
            className="text-3xl font-extrabold tabular-nums leading-none"
            style={{ color: '#111111' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay }}
          >
            {displayLoss}%
          </motion.span>
          <span className="section-label mt-1">yield loss</span>
        </div>

        <div className="w-px h-14 shrink-0" style={{ background: 'rgba(17,17,17,0.08)' }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2 gap-3">
            <span className="app-text flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" style={{ color: '#2D5A27' }} />
              With treatment
            </span>
            <span className="text-base font-extrabold tabular-nums" style={{ color: '#2D5A27' }}>
              {displayRecovery}% recovery
            </span>
          </div>

          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#2D5A27' }}
              initial={{ width: '0%' }}
              animate={{ width: `${recoverable}%` }}
              transition={{ duration: 2, delay: delay + 0.8, ease: 'easeOut' }}
            />
          </div>

          <p className="section-label mt-2">
            IPNI field trial data • {dominantNutrient} deficiency
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
