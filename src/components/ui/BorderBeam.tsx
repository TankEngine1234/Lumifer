import { cn } from '../../utils/cn';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  duration = 12,
  delay = 0,
  colorFrom = '#60a5fa',
  colorTo = '#4ade80',
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit]',
        className,
      )}
      style={{
        // Mask: show only the 1px border edge
        WebkitMask:
          'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        padding: '1px',
      }}
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: `conic-gradient(from calc(var(--beam-angle, 0) * 1deg), transparent 0%, ${colorFrom} 10%, ${colorTo} 20%, transparent 30%)`,
          animation: `border-beam-spin ${duration}s linear ${delay}s infinite`,
        }}
      />
      {/* Inject keyframes + set beam size via CSS custom property */}
      <style>{`
        @keyframes border-beam-spin {
          from { --beam-angle: 0; }
          to { --beam-angle: 360; }
        }
        @property --beam-angle {
          syntax: '<number>';
          initial-value: 0;
          inherits: false;
        }
      `}</style>
    </div>
  );
}
