import type { ReactNode } from 'react';
import type { DemoPhase } from '../../types';

interface Props {
  phase: DemoPhase;
  children: ReactNode;
}

export default function GradientBackground({ phase, children }: Props) {
  const bgColor = phase === 'results' ? 'var(--color-bg-surface)' : 'var(--color-bg-base)';
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: bgColor }}>
      {/* Decorative premium gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}
