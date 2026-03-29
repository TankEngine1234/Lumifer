import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { springDefault } from '../../animations/springs';
import { WebGLShader } from './web-gl-shader';

interface Props {
  onComplete?: () => void;
}

export default function Logo({ onComplete }: Props) {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center h-full gap-6 select-none overflow-hidden px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={{ duration: 0.6 }}
      onAnimationComplete={() => {
        setTimeout(() => onComplete?.(), 3500);
      }}
    >
      <WebGLShader className="absolute inset-0 w-full h-full block opacity-70" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, rgba(45,90,39,0.18), transparent 58%)' }}
      />

      <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center gap-5 text-center">
        <motion.div
          className="relative flex items-center justify-center rounded-[24px]"
          style={{ width: 96, height: 96, background: 'rgba(15,20,15,0.95)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}
          initial={{ rotate: -20, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ ...springDefault, delay: 0.3 }}
        >
          <Leaf className="w-12 h-12" style={{ color: '#2D5A27' }} strokeWidth={1.8} />
        </motion.div>

        <motion.h1
          className="text-[42px] font-extrabold tracking-tight"
          style={{ color: '#FFFFFF' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springDefault, delay: 0.5 }}
        >
          Lumifer
        </motion.h1>

        <motion.p
          className="text-base font-semibold tracking-wide text-center"
          style={{ color: 'rgba(255,255,255,0.78)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          Precision Crop Intelligence
        </motion.p>

        <motion.div
          className="app-chip"
          style={{
            background: 'rgba(15,20,15,0.92)',
            border: '1px solid rgba(45,90,39,0.6)',
            color: '#FFFFFF',
            boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.4 }}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2D5A27] opacity-30" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2D5A27]" />
          </span>
          On-device • No cloud required
        </motion.div>

        <motion.div
          className="w-full mt-3 flex justify-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springDefault, delay: 1.3 }}
        >
          <button
            type="button"
            className="w-full max-w-[360px]"
            style={{
              background: 'rgba(0,0,0,0.92)',
              color: '#FFFFFF',
              border: '2px solid #2D5A27',
              borderRadius: '16px',
              padding: '20px 24px',
              fontSize: '20px',
              fontWeight: 800,
              boxShadow: '0 14px 30px rgba(0,0,0,0.42)',
            }}
            onClick={() => onComplete?.()}
          >
            Scan a Field
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
