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
      className={clsx('glass p-4 shadow-2xl', className)}
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ ...springGentle, delay }}
      layout
    >
      {children}
    </motion.div>
  );
}
