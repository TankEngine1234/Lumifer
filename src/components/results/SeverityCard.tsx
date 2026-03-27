import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { SeverityLevel } from '../../types';
import GlassCard from '../ui/GlassCard';
import { capitalize } from '../../utils/format';

interface Props {
  severity: SeverityLevel;
  delay?: number;
}

const severityConfig: Record<SeverityLevel, {
  color: string;
  icon: typeof AlertTriangle;
  description: string;
}> = {
  low: {
    color: '#22C55E',
    icon: CheckCircle,
    description: 'Minor nutrient imbalance detected. Crop yield impact is minimal with timely correction.',
  },
  moderate: {
    color: '#EAB308',
    icon: AlertTriangle,
    description: 'Significant nutrient stress detected. Intervention recommended within 5 days to prevent yield loss.',
  },
  severe: {
    color: '#EF4444',
    icon: XCircle,
    description: 'Critical deficiency detected. Immediate action required — every day of delay reduces recovery potential.',
  },
};

export default function SeverityCard({ severity, delay = 0 }: Props) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <GlassCard delay={delay}>
      <div className="flex items-start gap-3">
        <motion.div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${config.color}15` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-white">Severity Assessment</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: config.color, backgroundColor: `${config.color}20` }}
            >
              {capitalize(severity)}
            </span>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">{config.description}</p>
        </div>
      </div>
    </GlassCard>
  );
}
