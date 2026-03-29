import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { DemoPhase } from '../../types';

const glowPositions: Record<DemoPhase, string> = {
  splash: '20% 60%',
  fieldmap: '30% 50%',
  zone: '40% 45%',
  capture: '50% 40%',
  lock: '50% 40%',
  captured: '55% 42%',
  analyzing: '50% 50%',
  heatmap: '65% 40%',
  results: '80% 40%',
  context: '60% 30%',
};

interface Props {
  phase: DemoPhase;
  children: ReactNode;
}

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
