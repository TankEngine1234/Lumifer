import { motion } from 'framer-motion';
import { AlertTriangle, Camera } from 'lucide-react';
import type { FieldZone } from '../../types';
import { springGentle } from '../../animations/springs';

interface Props {
  zone: FieldZone;
  onScanLeaf: () => void;
}

const severityStyle: Record<string, { color: string; label: string }> = {
  low:      { color: '#22c55e', label: 'Mild Stress' },
  moderate: { color: '#f59e0b', label: 'Moderate' },
  severe:   { color: '#ef4444', label: 'Critical' },
};

export default function ZoneCard({ zone, onScanLeaf }: Props) {
  const s = severityStyle[zone.severity];

  return (
    <motion.div
      className="absolute bottom-20 left-4 right-4 z-40"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={springGentle}
    >
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(10,10,10,0.82)',
          border: `1px solid ${s.color}30`,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Coloured top accent strip */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${s.color}80, transparent)` }} />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: s.color, background: `${s.color}18` }}
                >
                  {s.label}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white truncate">{zone.label}</h3>
              <p className="text-[11px] text-white/45 mt-0.5 leading-tight">{zone.description}</p>
            </div>

            {/* NDVI value — big and clear */}
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold leading-none" style={{ color: s.color }}>
                {zone.ndviValue.toFixed(2)}
              </div>
              <div className="text-[9px] text-white/35 mt-0.5">NDVI</div>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(to right, ${s.color}, ${s.color}99)` }}
                initial={{ width: '0%' }}
                animate={{ width: `${(zone.ndviValue / 0.8) * 100}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" style={{ color: s.color }} />
              <span className="text-[10px] text-white/50">Below 0.60 threshold</span>
            </div>
          </div>

          {/* CTA */}
          <motion.button
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer"
            style={{ background: 'rgba(34,197,94,0.9)' }}
            whileTap={{ scale: 0.97 }}
            onClick={onScanLeaf}
          >
            <Camera className="w-4 h-4" />
            Scan a leaf in this area
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
