import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { springDefault } from '../../animations/springs';
import { WebGLShader } from './web-gl-shader';
import { LiquidButton } from './liquid-glass-button';

interface Props {
  onComplete?: () => void;
}

export default function Logo({ onComplete }: Props) {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center h-full gap-6 select-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={{ duration: 0.6 }}
      onAnimationComplete={() => {
        // Auto-advance after splash hold if not manually tapped
        setTimeout(() => onComplete?.(), 3500);
      }}
    >
      {/* WebGL animated background — fills the splash container */}
      <WebGLShader className="absolute inset-0 w-full h-full block" />

      {/* Subtle dark gradient overlay so text stays legible */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/70 pointer-events-none" />

      {/* Content stack */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Leaf icon with glow */}
        <motion.div
          className="relative"
          initial={{ rotate: -20, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ ...springDefault, delay: 0.3 }}
        >
          <div className="absolute inset-0 blur-3xl bg-green-500/30 rounded-full scale-150" />
          <Leaf className="relative w-16 h-16 text-green-400" strokeWidth={1.5} />
        </motion.div>

        {/* App name */}
        <motion.h1
          className="text-5xl font-extrabold tracking-tight text-white"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springDefault, delay: 0.5 }}
        >
          Lumifer
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-sm text-white/55 font-light tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          Precision Crop Intelligence
        </motion.p>

        {/* Availability pill */}
        <motion.div
          className="flex items-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.4 }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <p className="text-xs text-green-400">On-device · No cloud required</p>
        </motion.div>

        {/* Liquid glass CTA button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springDefault, delay: 1.3 }}
        >
          <LiquidButton
            size="xl"
            className="text-white border border-white/20 rounded-full font-semibold tracking-wide px-10"
            onClick={() => onComplete?.()}
          >
            Scan a Field
          </LiquidButton>
        </motion.div>
      </div>
    </motion.div>
  );
}
