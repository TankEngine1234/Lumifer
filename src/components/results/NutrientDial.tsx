import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { NutrientType, DeficiencyLevel } from '../../types';
import { springDefault } from '../../animations/springs';
import { capitalize } from '../../utils/format';

interface Props {
  nutrient: NutrientType;
  confidence: number; // 0–1
  level: DeficiencyLevel;
  color: string;
  delay?: number;
}

const circumference = 2 * Math.PI * 44; // radius = 44

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
  }, [confidence, delay]);

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springDefault, delay }}
    >
      {/* SVG Ring */}
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle
            cx="48" cy="48" r="44"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          {/* Progress ring */}
          <motion.circle
            cx="48" cy="48" r="44"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>

        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white tabular-nums">
            {displayValue}
            <span className="text-sm font-normal text-white/50">%</span>
          </span>
        </div>
      </div>

      {/* Nutrient label */}
      <div className="text-center">
        <p className="text-xs font-semibold text-white/80">{capitalize(nutrient)}</p>
        <p
          className="text-[10px] font-medium mt-0.5 px-2 py-0.5 rounded-full"
          style={{
            color,
            backgroundColor: `${color}15`,
          }}
        >
          {capitalize(level)}
        </p>
      </div>
    </motion.div>
  );
}
