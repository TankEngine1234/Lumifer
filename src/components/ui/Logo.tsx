import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { springDefault } from '../../animations/springs';

interface Props {
  onComplete?: () => void;
}

export default function Logo({ onComplete }: Props) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full gap-4"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={springDefault}
      onAnimationComplete={() => {
        // Auto-advance after splash hold
        setTimeout(() => onComplete?.(), 2000);
      }}
    >
      {/* Leaf icon with glow */}
      <motion.div
        className="relative"
        initial={{ rotate: -20, scale: 0.5 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ ...springDefault, delay: 0.2 }}
      >
        <div className="absolute inset-0 blur-2xl bg-green-500/20 rounded-full scale-150" />
        <Leaf className="relative w-16 h-16 text-green-400" strokeWidth={1.5} />
      </motion.div>

      {/* App name */}
      <motion.h1
        className="text-4xl font-semibold tracking-tight text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springDefault, delay: 0.4 }}
      >
        Lumifer
      </motion.h1>

      {/* Tagline */}
      <motion.p
        className="text-sm text-white/50 font-light"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        Precision Crop Intelligence
      </motion.p>
    </motion.div>
  );
}
