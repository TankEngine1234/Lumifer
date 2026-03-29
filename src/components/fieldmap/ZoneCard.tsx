import { motion } from 'framer-motion';
import { AlertTriangle, Camera } from 'lucide-react';
import type { FieldZone } from '../../types';
import { springGentle } from '../../animations/springs';

interface Props {
  zone: FieldZone;
  onScanLeaf: () => void;
}

const severityStyle: Record<string, { color: string; label: string }> = {
  low: { color: '#6B9165', label: 'Mild Stress' },
  moderate: { color: '#2D5A27', label: 'Moderate' },
  severe: { color: '#111111', label: 'Critical' },
};

export default function ZoneCard({ zone, onScanLeaf }: Props) {
  const s = severityStyle[zone.severity];

  return (
    <motion.div
      className="absolute bottom-[180px] left-4 right-4 z-40 lg:right-[480px]"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={springGentle}
    >
      <div className="app-card mx-auto max-w-[480px] overflow-hidden">
        <div className="h-1 w-full" style={{ background: s.color }} />

        <div className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-extrabold px-3 py-1 rounded-full"
                  style={{ color: s.color, background: `${s.color}12` }}
                >
                  {s.label}
                </span>
              </div>
              <h3 className="text-[22px] font-extrabold leading-tight" style={{ color: '#111111' }}>{zone.label}</h3>
              <p className="app-text mt-2">{zone.description}</p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-3xl font-extrabold leading-none" style={{ color: s.color }}>
                {zone.ndviValue.toFixed(2)}
              </div>
              <div className="section-label mt-1">NDVI</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(17,17,17,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: s.color }}
                initial={{ width: '0%' }}
                animate={{ width: `${(zone.ndviValue / 0.8) * 100}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" style={{ color: s.color }} />
              <span className="section-label">Below 0.60 threshold</span>
            </div>
          </div>

          <motion.button
            className="app-button-primary app-button-cta"
            whileTap={{ scale: 0.98 }}
            onClick={onScanLeaf}
          >
            <Camera className="w-5 h-5" />
            Scan a leaf in this area
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
