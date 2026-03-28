import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { springGentle } from '../../animations/springs';
import clsx from 'clsx';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function GlassCard({ children, className, delay = 0 }: Props) {
  return (
    <motion.div
      className={clsx('glass p-4', className)}
      style={{
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 4px 16px rgba(0,0,0,0.4)',
      }}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...springGentle, delay }}
      layout
    >
      {children}
    </motion.div>
  );
}
