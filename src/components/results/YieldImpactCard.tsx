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

  // Find dominant deficiency for recovery estimate
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
    <GlassCard delay={delay}>
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          Yield Impact Estimate
        </h4>

        {/* Yield loss */}
        <div className="flex items-end gap-2">
          <motion.span
            className="text-4xl font-bold text-red-400 tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay }}
          >
            {displayLoss}%
          </motion.span>
          <span className="text-xs text-white/40 mb-1">estimated yield loss</span>
        </div>

        {/* Recovery bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-green-400" />
              With treatment: recoverable to
            </span>
            <span className="text-xs font-bold text-green-400 tabular-nums">
              {displayRecovery}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400"
              initial={{ width: '0%' }}
              animate={{ width: `${recoverable}%` }}
              transition={{ duration: 2, delay: delay + 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        <p className="text-[10px] text-white/30">
          Based on IPNI field trial data for {dominantNutrient} deficiency in corn
        </p>
      </div>
    </GlassCard>
  );
}
