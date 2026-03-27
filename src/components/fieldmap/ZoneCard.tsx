import { motion } from 'framer-motion';
import { AlertTriangle, Camera } from 'lucide-react';
import type { FieldZone } from '../../types';
import { springGentle } from '../../animations/springs';
import GlassCard from '../ui/GlassCard';

interface Props {
  zone: FieldZone;
  onScanLeaf: () => void;
}

const severityLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'Mild Stress', color: '#22C55E' },
  moderate: { label: 'Moderate Stress', color: '#EAB308' },
  severe: { label: 'Critical', color: '#EF4444' },
};

export default function ZoneCard({ zone, onScanLeaf }: Props) {
  const severity = severityLabels[zone.severity];

  return (
    <motion.div
      className="absolute bottom-20 left-4 right-4 z-30"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={springGentle}
    >
      <GlassCard className="p-5">
        {/* Zone header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-white">{zone.label}</h3>
            <p className="text-xs text-white/50 mt-0.5">{zone.description}</p>
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${severity.color}20`, color: severity.color }}
          >
            <AlertTriangle className="w-3 h-3" />
            {severity.label}
          </div>
        </div>

        {/* NDVI reading */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/5">
          <div className="text-2xl font-bold text-white">{zone.ndviValue.toFixed(2)}</div>
          <div>
            <div className="text-xs text-white/40">Vegetation Index (NDVI)</div>
            <div className="text-xs mt-0.5" style={{ color: severity.color }}>
              Below healthy threshold (0.60)
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <motion.button
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/90 text-white font-medium text-sm cursor-pointer"
          whileTap={{ scale: 0.97 }}
          onClick={onScanLeaf}
        >
          <Camera className="w-4 h-4" />
          Scan a leaf in this area
        </motion.button>
      </GlassCard>
    </motion.div>
  );
}
