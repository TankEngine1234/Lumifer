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

const nutrientColors: Record<string, string> = {
  nitrogen: '#EAB308',
  phosphorus: '#A855F7',
  potassium: '#F59E0B',
};

export default function ActionPlanCard({ plan, delay = 0 }: Props) {
  const Icon = iconMap[plan.icon] || Droplets;
  const color = nutrientColors[plan.nutrient] || '#22C55E';

  return (
    <GlassCard delay={delay} className="!p-3">
      <div className="flex items-start gap-3">
        <motion.div
          className="p-2 rounded-lg shrink-0"
          style={{ backgroundColor: `${color}15` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.15, type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">{plan.title}</h4>
          <p className="text-xs text-white/50 leading-relaxed mb-2">{plan.description}</p>

          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {plan.rate}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {plan.timing}
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
