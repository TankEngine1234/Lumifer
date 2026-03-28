import { motion } from 'framer-motion';
import { Zap, CloudRain, Wind, CheckCircle } from 'lucide-react';
import type { NPKResult, NASAClimateResult, NutrientType } from '../../types';
import { getCorrelationsForNutrient } from '../../data/climateStressCorrelations';
import GlassCard from '../ui/GlassCard';

interface Props {
  npkResult: NPKResult;
  climate: NASAClimateResult;
  delay?: number;
}

const nutrientLabel: Record<NutrientType, string> = {
  nitrogen: 'Nitrogen',
  phosphorus: 'Phosphorus',
  potassium: 'Potassium',
};

const stressIcon = { heat: Zap, drought: CloudRain, humidity: Wind };
const stressColor = { heat: '#f87171', drought: '#fb923c', humidity: '#60a5fa' };

export default function StressNarrativeCard({ npkResult, climate, delay = 0.6 }: Props) {
  // Find primary deficiency
  const nutrients: NutrientType[] = ['nitrogen', 'phosphorus', 'potassium'];
  const primaryNutrient = nutrients
    .filter(n => npkResult[n].level === 'deficient')
    .sort((a, b) => npkResult[b].confidence - npkResult[a].confidence)[0] ?? 'nitrogen';

  const correlations = getCorrelationsForNutrient(primaryNutrient);

  // Check which correlation is confirmed by climate data
  const confirmed = correlations.find(c => {
    if (c.stressType === 'heat') return climate.heatDays >= c.confirmThreshold;
    if (c.stressType === 'drought') return climate.droughtGap >= c.confirmThreshold;
    if (c.stressType === 'humidity') return climate.lowHumidityDays >= c.confirmThreshold;
    return false;
  });

  if (!confirmed) {
    return (
      <GlassCard delay={delay} className="!p-3">
        <div className="flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">Climate Conditions Normal</p>
            <p className="text-xs text-white/70 leading-relaxed">
              NASA data shows no major heat, drought, or humidity stress events over the past 90 days.
              The detected <span className="font-semibold text-white">{nutrientLabel[primaryNutrient]}</span> deficiency
              likely has a soil chemistry or agronomic cause — check soil pH and application history.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  const Icon = stressIcon[confirmed.stressType];
  const color = stressColor[confirmed.stressType];

  const stressDesc = confirmed.stressType === 'heat'
    ? `${climate.heatDays} heat days above 34°C`
    : confirmed.stressType === 'drought'
    ? `${climate.droughtGap} consecutive days without rain`
    : `${climate.lowHumidityDays} days below 40% humidity`;

  return (
    <GlassCard delay={delay} className="!p-3">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.1 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <p className="text-sm font-semibold text-white">Climate Explains Deficiency</p>
        </div>

        {/* Narrative sentence */}
        <p className="text-xs text-white/80 leading-relaxed mb-2.5">
          Your leaf shows{' '}
          <span className="font-semibold text-white">{nutrientLabel[primaryNutrient]} deficiency.</span>{' '}
          NASA POWER data recorded{' '}
          <span className="font-semibold" style={{ color }}>{stressDesc}</span>{' '}
          this season — {confirmed.mechanismShort}
        </p>

        {/* Uptake reduction bar */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-white/40">{nutrientLabel[primaryNutrient]} uptake reduction</span>
              <span className="text-[10px] font-bold" style={{ color }}>
                {confirmed.uptakeReductionMin}–{confirmed.uptakeReductionMax}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(to right, ${color}88, ${color})` }}
                initial={{ width: '0%' }}
                animate={{ width: `${confirmed.uptakeReductionMax}%` }}
                transition={{ duration: 1.2, delay: delay + 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Citation */}
        <p className="text-[9px] text-white/25 leading-snug">
          Source: {confirmed.citation}
        </p>
      </motion.div>
    </GlassCard>
  );
}
