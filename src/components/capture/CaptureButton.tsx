import { motion } from 'framer-motion';
import { springBouncy } from '../../animations/springs';

interface Props {
  onCapture: () => void;
  disabled?: boolean;
}

export default function CaptureButton({ onCapture, disabled }: Props) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
      <motion.button
        className="relative w-18 h-18 rounded-full cursor-pointer"
        style={{ width: 72, height: 72 }}
        whileTap={{ scale: 0.9 }}
        transition={springBouncy}
        onClick={onCapture}
        disabled={disabled}
      >
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-white/80" />

        {/* Inner fill */}
        <motion.div
          className="absolute inset-2 rounded-full bg-white"
          whileTap={{ scale: 0.85 }}
          transition={springBouncy}
        />
      </motion.button>
    </div>
  );
}
