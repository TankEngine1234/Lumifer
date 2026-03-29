import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { SeverityLevel } from '../../types';
import GlassCard from '../ui/GlassCard';
import { capitalize } from '../../utils/format';

interface Props {
  severity: SeverityLevel;
  allOptimal?: boolean;
  delay?: number;
}

const severityConfig: Record<SeverityLevel, {
  color: string;
  icon: typeof AlertTriangle;
  description: string;
  className: string;
}> = {
  low: {
    color: 'var(--color-severity-low)',
    icon: CheckCircle,
    description: 'Minor nutrient imbalance detected. Crop yield impact is minimal with timely correction.',
    className: 'bg-green-500/20 text-green-400',
  },
  moderate: {
    color: 'var(--color-severity-moderate)',
    icon: AlertTriangle,
    description: 'Significant nutrient stress detected. Intervention recommended to prevent yield loss.',
    className: 'bg-amber-500/20 text-amber-400',
  },
  severe: {
    color: 'var(--color-severity-severe)',
    icon: XCircle,
    description: 'Critical deficiency detected. Immediate action required to reduce potential yield loss.',
    className: 'bg-red-500/20 text-red-400',
  },
};

export default function SeverityCard({ severity, allOptimal, delay = 0 }: Props) {
  const config = allOptimal
    ? { color: 'var(--color-severity-low)', icon: CheckCircle, description: 'No nutrient deficiency detected. Plant tissue appears healthy.', className: 'bg-green-500/20 text-green-400' }
    : severityConfig[severity];
  const Icon = config.icon;
  const label = allOptimal ? 'Healthy' : capitalize(severity);

  return (
    <GlassCard delay={delay} className="p-5 mb-4">
      <div className="flex items-start gap-4">
        <motion.div
          className="p-2 rounded-full"
          style={{ backgroundColor: `${config.color.replace(')',', 0.1)').replace('rgb(','rgba(')}`}}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold tracking-wide text-white/90">Severity Assessment</span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${config.className}`}
            >
              {label}
            </span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">{config.description}</p>
        </div>
      </div>
    </GlassCard>
  );
}
