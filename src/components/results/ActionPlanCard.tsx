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
  nitrogen: '#2D5A27',
  phosphorus: '#4A7A44',
  potassium: '#6B9165',
};

export default function ActionPlanCard({ plan, delay = 0 }: Props) {
  const Icon = iconMap[plan.icon] || Droplets;
  const color = nutrientColors[plan.nutrient] || '#2D5A27';

  return (
    <GlassCard delay={delay} className="!p-5">
      <div className="flex items-start gap-4">
        <motion.div
          className="p-3 rounded-xl shrink-0"
          style={{ backgroundColor: `${color}12` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.15, type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <h4 className="app-label mb-2">{plan.title}</h4>
          <p className="app-text mb-3" style={{ lineHeight: 1.55 }}>
            {plan.description}
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="app-chip">{plan.rate}</span>
            <span className="app-chip">{plan.timing}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
