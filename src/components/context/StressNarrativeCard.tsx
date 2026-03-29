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
const stressColor = { heat: '#111111', drought: '#2D5A27', humidity: '#4A7A44' };

export default function StressNarrativeCard({ npkResult, climate, delay = 0.6 }: Props) {
  const nutrients: NutrientType[] = ['nitrogen', 'phosphorus', 'potassium'];
  const primaryNutrient = nutrients
    .filter(n => npkResult[n].level === 'deficient')
    .sort((a, b) => npkResult[b].confidence - npkResult[a].confidence)[0] ?? 'nitrogen';

  const correlations = getCorrelationsForNutrient(primaryNutrient);

  const confirmed = correlations.find(c => {
    if (c.stressType === 'heat') return climate.heatDays >= c.confirmThreshold;
    if (c.stressType === 'drought') return climate.droughtGap >= c.confirmThreshold;
    if (c.stressType === 'humidity') return climate.lowHumidityDays >= c.confirmThreshold;
    return false;
  });

  if (!confirmed) {
    return (
      <GlassCard delay={delay} className="!p-5">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#2D5A27' }} />
          <div>
            <p className="app-label mb-2">Climate Conditions Normal</p>
            <p className="app-text" style={{ lineHeight: 1.55 }}>
              NASA data shows no major heat, drought, or humidity stress events over the past 90 days.
              The detected <span style={{ color: '#111111', fontWeight: 800 }}> {nutrientLabel[primaryNutrient]} </span>
              deficiency likely has a soil chemistry or agronomic cause. Check soil pH and application history.
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
    <GlassCard delay={delay} className="!p-5">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.1 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: `${color}12` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <p className="app-label">Climate Explains Deficiency</p>
        </div>

        <p className="app-text mb-4" style={{ lineHeight: 1.6 }}>
          Your leaf shows <span style={{ color: '#111111', fontWeight: 800 }}>{nutrientLabel[primaryNutrient]} deficiency.</span>
          NASA POWER data recorded <span style={{ color, fontWeight: 800 }}> {stressDesc} </span>
          this season, and {confirmed.mechanismShort}
        </p>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <span className="section-label">{nutrientLabel[primaryNutrient]} uptake reduction</span>
              <span className="text-sm font-extrabold" style={{ color }}>
                {confirmed.uptakeReductionMin}–{confirmed.uptakeReductionMax}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: '0%' }}
                animate={{ width: `${confirmed.uptakeReductionMax}%` }}
                transition={{ duration: 1.2, delay: delay + 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        <p className="section-label">Source: {confirmed.citation}</p>
      </motion.div>
    </GlassCard>
  );
}
