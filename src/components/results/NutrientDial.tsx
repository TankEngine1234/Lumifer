import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { NutrientType, DeficiencyLevel } from '../../types';
import { springDefault } from '../../animations/springs';
import { capitalize } from '../../utils/format';

interface Props {
  nutrient: NutrientType;
  confidence: number;
  level: DeficiencyLevel;
  color: string;
  delay?: number;
}

const circumference = 2 * Math.PI * 36;

export default function NutrientDial({ nutrient, confidence, level, color, delay = 0 }: Props) {
  const [displayValue, setDisplayValue] = useState(0);
  const progress = useMotionValue(0);
  const dashOffset = useTransform(progress, (v) => circumference * (1 - v));

  useEffect(() => {
    const controls = animate(progress, confidence, {
      duration: 2,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayValue(Math.round(v * 100)),
    });
    return controls.stop;
  }, [confidence, delay, progress]);

  const isDeficient = level === 'deficient';

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springDefault, delay }}
    >
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke="rgba(17,17,17,0.08)"
            strokeWidth="7"
          />
          <motion.circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke={isDeficient ? 'var(--color-destructive)' : color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-extrabold tabular-nums" style={{ color: '#111111' }}>
            {displayValue}
            <span className="text-sm font-semibold" style={{ color: '#444444' }}>%</span>
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="app-label">{capitalize(nutrient)}</p>
        <p
          className="text-xs font-bold mt-1 px-3 py-1 rounded-full"
          style={{
            color,
            backgroundColor: `${color}12`,
          }}
        >
          {capitalize(level)}
        </p>
      </div>
    </motion.div>
  );
}
