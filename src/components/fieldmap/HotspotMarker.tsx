import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import type { FieldZone } from '../../types';
import { springBouncy } from '../../animations/springs';

interface Props {
  zone: FieldZone;
  delay?: number;
  onClick?: () => void;
}

const severityColors: Record<string, string> = {
  low: '#6B9165',
  moderate: '#2D5A27',
  severe: '#111111',
};

export default function HotspotMarker({ zone, delay = 0, onClick }: Props) {
  const color = severityColors[zone.severity] || '#111111';

  return (
    <motion.button
      className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer"
      style={{ left: `${zone.position.x}%`, top: `${zone.position.y}%` }}
      initial={{ opacity: 0, scale: 0, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...springBouncy, delay }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
    >
      <motion.div
        className="absolute w-10 h-10 rounded-full"
        style={{ backgroundColor: `${color}12`, border: `2px solid ${color}30` }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <MapPin
        className="w-7 h-7 drop-shadow-lg"
        style={{ color }}
        fill={color}
        fillOpacity={0.22}
        strokeWidth={2}
      />

      <span
        className="mt-1 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap"
        style={{ backgroundColor: '#FFFFFF', color, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
      >
        NDVI {zone.ndviValue.toFixed(2)}
      </span>
    </motion.button>
  );
}
