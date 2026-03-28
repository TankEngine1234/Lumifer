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
      {/* True dark base — no color tint */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      {/* Subtle vignette depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

      {/* Very faint phase-aware glow — near-white, architectural not thematic */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `radial-gradient(ellipse 55% 40% at ${glowPositions[phase]}, rgba(255,255,255,0.025) 0%, transparent 65%)`,
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
