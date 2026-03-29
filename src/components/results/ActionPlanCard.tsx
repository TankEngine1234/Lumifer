import { motion } from 'framer-motion';
import { Droplets, AlertTriangle, Siren } from 'lucide-react';
import type { ActionPlan } from '../../types';
import GlassCard from '../ui/GlassCard';

interface Props {
  plan: ActionPlan;
  delay?: number;
}

const iconMap: Record<string, typeof Droplets> = {
  Droplets,
  AlertTriangle,
  Siren,
};

const nutrientColorMap: Record<string, { color: string, className: string }> = {
  nitrogen: { color: 'var(--color-nitrogen)', className: 'bg-green-500/20 text-green-400' },
  phosphorus: { color: 'var(--color-phosphorus)', className: 'bg-blue-500/20 text-blue-400' },
  potassium: { color: 'var(--color-potassium)', className: 'bg-orange-500/20 text-orange-400' },
};

export default function ActionPlanCard({ plan, delay = 0 }: Props) {
  const Icon = iconMap[plan.icon] || Droplets;
  const nutrientStyle = nutrientColorMap[plan.nutrient] || nutrientColorMap.nitrogen;

  return (
    <GlassCard delay={delay} className="p-4">
      <div className="flex items-start gap-3">
        <motion.div
          className="p-2 rounded-lg shrink-0"
          style={{ backgroundColor: `${nutrientStyle.color.replace(')',', 0.1)').replace('rgb(','rgba(')}`}}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.15, type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Icon className="w-4 h-4" style={{ color: nutrientStyle.color }} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">{plan.title}</h4>
          <p className="text-sm text-white/60 leading-relaxed mb-3">{plan.description}</p>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/10 text-white/70 border-white/20">
              {plan.rate}
            </span>
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/10 text-white/70 border-white/20">
              {plan.timing}
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
