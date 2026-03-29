import { motion, animate } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TrendingDown, ArrowUpRight } from 'lucide-react';
import type { NPKResult, NutrientType } from '../../types';
import { yieldImpactByDeficiency } from '../../data/nutrientThresholds';
import GlassCard from '../ui/GlassCard';
import { capitalize } from '../../utils/format';

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
    <GlassCard delay={delay} className="p-4">
      <div className="flex items-center gap-4">
        {/* Yield loss — compact */}
        <div className="flex flex-col items-center shrink-0 text-center">
          <TrendingDown className="w-4 h-4 text-red-400 mb-1" />
          <motion.span
            className="text-2xl font-bold text-red-400 tabular-nums leading-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay }}
          >
            {displayLoss}%
          </motion.span>
          <span className="text-xs text-white/60 mt-0.5">yield loss</span>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-white/20 shrink-0" />

        {/* Recovery */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              With treatment
            </span>
            <span className="text-sm font-bold text-green-400 tabular-nums">
              {displayRecovery}% recovery
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-green-500"
              initial={{ width: '0%' }}
              animate={{ width: `${recoverable}%` }}
              transition={{ duration: 2, delay: delay + 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-white/60 mt-1.5">
            Source: IPNI · {capitalize(dominantNutrient)} deficiency trials
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
