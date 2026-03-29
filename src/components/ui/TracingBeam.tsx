import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '../../utils/cn';

interface TracingBeamProps {
  children: React.ReactNode;
  className?: string;
}

export function TracingBeam({ children, className }: TracingBeamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Track scroll progress as 0–1
  const scrollProgress = useMotionValue(0);
  const springProgress = useSpring(scrollProgress, { stiffness: 120, damping: 20 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    };

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll > 0) {
        scrollProgress.set(scrollTop / maxScroll);
      }
    };

    updateHeight();
    container.addEventListener('scroll', handleScroll, { passive: true });

    const ro = new ResizeObserver(updateHeight);
    if (contentRef.current) ro.observe(contentRef.current);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      ro.disconnect();
    };
  }, [scrollProgress]);

  return (
    <div ref={containerRef} className={cn('relative overflow-y-auto', className)}>
      <div className="absolute left-5 top-0 z-10" style={{ height: contentHeight || '100%' }}>
        {/* Background track */}
        <svg
          className="absolute left-0 top-0"
          width="2"
          height="100%"
          viewBox={`0 0 2 ${contentHeight || 100}`}
          preserveAspectRatio="none"
          fill="none"
        >
          <line
            x1="1" y1="0" x2="1" y2="100%"
            stroke="var(--color-border)"
            strokeWidth="2"
          />
        </svg>

        {/* Animated beam overlay */}
        <motion.div
          className="absolute left-0 top-0 w-0.5 origin-top"
          style={{
            height: contentHeight || '100%',
            scaleY: springProgress,
            background: 'linear-gradient(to bottom, var(--color-phosphorus), var(--color-nitrogen))',
            borderRadius: '9999px',
          }}
        />

        {/* Glowing dot at beam tip */}
        <motion.div
          className="absolute left-[-3px] w-2 h-2 rounded-full"
          style={{
            background: 'var(--color-ring)',
            boxShadow: '0 0 8px var(--color-ring), 0 0 16px var(--color-ring)',
            top: contentHeight
              ? undefined
              : '0%',
            y: contentHeight
              ? springProgress.get() * contentHeight
              : undefined,
          }}
          // For smooth tracking: use a motion value transform
          animate={{
            top: `calc(${springProgress.get() * 100}%)`,
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      <div ref={contentRef} className="relative pl-12">
        {children}
      </div>
    </div>
  );
}
