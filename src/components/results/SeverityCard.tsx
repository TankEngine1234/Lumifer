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
}> = {
  low: {
    color: '#6B9165',
    icon: CheckCircle,
    description: 'Minor nutrient imbalance detected. Crop yield impact is minimal with timely correction.',
  },
  moderate: {
    color: '#2D5A27',
    icon: AlertTriangle,
    description: 'Significant nutrient stress detected. Intervention recommended to prevent yield loss.',
  },
  severe: {
    color: '#111111',
    icon: XCircle,
    description: 'Critical deficiency detected. Immediate action required and recovery potential drops with delay.',
  },
};

export default function SeverityCard({ severity, allOptimal, delay = 0 }: Props) {
  const config = allOptimal
    ? { color: '#6B9165', icon: CheckCircle, description: 'No nutrient deficiency detected. Plant tissue appears healthy.' }
    : severityConfig[severity];
  const Icon = config.icon;
  const label = allOptimal ? 'Healthy' : capitalize(severity);

  return (
    <GlassCard delay={delay} className="!p-5">
      <div className="flex items-start gap-4">
        <motion.div
          className="p-3 rounded-xl"
          style={{ backgroundColor: `${config.color}12` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="app-label">Severity Assessment</span>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ color: config.color, backgroundColor: `${config.color}14` }}
            >
              {label}
            </span>
          </div>
          <p className="app-text" style={{ lineHeight: 1.55 }}>
            {config.description}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
