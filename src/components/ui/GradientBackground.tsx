import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { DemoPhase } from '../../types';

interface Props {
  phase: DemoPhase;
  children: ReactNode;
}

// The radial glow shifts position based on the current phase
const glowPositions: Record<DemoPhase, string> = {
  splash: '50% 40%',
  fieldmap: '50% 30%',
  zone: '60% 30%',
  capture: '50% 50%',
  lock: '50% 50%',
  captured: '50% 50%',
  analyzing: '50% 45%',
  heatmap: '50% 40%',
  results: '50% 35%',
};

export default function GradientBackground({ phase, children }: Props) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0D2818] to-[#1A472A]" />

      {/* Animated radial glow */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `radial-gradient(ellipse 60% 50% at ${glowPositions[phase]}, rgba(34, 197, 94, 0.08) 0%, transparent 70%)`,
        }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />

      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}
