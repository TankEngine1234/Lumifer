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
      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}
