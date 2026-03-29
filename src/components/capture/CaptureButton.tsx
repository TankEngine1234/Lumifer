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
        className="relative rounded-full cursor-pointer"
        style={{ width: 92, height: 92 }}
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        onClick={onCapture}
        disabled={disabled}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: '#FFFFFF',
            border: '4px solid #2D5A27',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            opacity: disabled ? 0.55 : 1,
          }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: 14,
            background: '#2D5A27',
          }}
          whileTap={{ scale: 0.88 }}
          transition={springBouncy}
        />
      </motion.button>
    </div>
  );
}
