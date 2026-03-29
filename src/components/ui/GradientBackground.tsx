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
  context: '50% 60%',
};

export default function GradientBackground({ phase, children }: Props) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Stable light app background */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: '#050805',
        }}
      />

      {/* Very faint green radial wash */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `radial-gradient(ellipse 55% 40% at ${glowPositions[phase]}, rgba(45,90,39,0.16) 0%, transparent 65%)`,
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
