import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import createGlobe from 'cobe';

interface PulseMarker {
  id: string;
  location: [number, number];
  delay: number;
}

interface GlobePulseProps {
  markers?: PulseMarker[];
  className?: string;
  speed?: number;
}

const defaultMarkers: PulseMarker[] = [
  { id: 'imperial', location: [32.8473, -115.5694], delay: 0 },
  { id: 'brawley', location: [32.9787, -115.5303], delay: 0.5 },
  { id: 'el-centro', location: [32.7920, -115.5631], delay: 1 },
  { id: 'holtville', location: [32.8112, -115.3789], delay: 1.5 },
];

export function GlobePulse({
  markers = defaultMarkers,
  className = '',
  speed = 0.0024,
}: GlobePulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(-1.18);
  const thetaOffsetRef = useRef(-0.18);
  const isPausedRef = useRef(false);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }

    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current === null) return;

      dragOffset.current = {
        phi: (e.clientX - pointerInteracting.current.x) / 320,
        theta: (e.clientY - pointerInteracting.current.y) / 1200,
      };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let phi = 0;
    let resizeObserver: ResizeObserver | null = null;

    const init = () => {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: phiOffsetRef.current,
        theta: thetaOffsetRef.current,
        dark: 1,
        diffuse: 1.35,
        mapSamples: 18000,
        mapBrightness: 5,
        baseColor: [0.08, 0.18, 0.08],
        markerColor: [0.84, 0.96, 0.84],
        glowColor: [0.05, 0.16, 0.07],
        markers: markers.map((marker) => ({
          location: marker.location,
          size: 0.09,
        })),
        opacity: 1,
        onRender: (state) => {
          if (!isPausedRef.current) phi += speed;
          state.phi = phi + phiOffsetRef.current + dragOffset.current.phi;
          state.theta = thetaOffsetRef.current + dragOffset.current.theta;
        },
      });

      requestAnimationFrame(() => {
        canvas.style.opacity = '1';
      });
    };

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width) {
          resizeObserver?.disconnect();
          init();
        }
      });
      resizeObserver.observe(canvas);
    }

    const handleResize = () => {
      if (!globe || !canvas.offsetWidth) return;
      const width = canvas.offsetWidth;
      globe.destroy();
      globe = null;
      canvas.width = width * Math.min(window.devicePixelRatio || 1, 2);
      canvas.height = width * Math.min(window.devicePixelRatio || 1, 2);
      init();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      globe?.destroy();
    };
  }, [markers, speed]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <style>{`
        @keyframes globe-pulse-ring {
          0% { transform: scale(0.88); opacity: 0.58; }
          100% { transform: scale(1.12); opacity: 0; }
        }
      `}</style>

      <div
        className="absolute inset-[8%] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(63,147,57,0.28) 0%, rgba(22,44,21,0) 72%)',
          filter: 'blur(18px)',
        }}
      />

      <div
        className="absolute inset-[8%] rounded-full border"
        style={{
          borderColor: 'rgba(147, 213, 124, 0.35)',
          animation: 'globe-pulse-ring 3.4s ease-out infinite',
        }}
      />
      <div
        className="absolute inset-[14%] rounded-full border"
        style={{
          borderColor: 'rgba(147, 213, 124, 0.22)',
          animation: 'globe-pulse-ring 3.4s ease-out infinite 1.1s',
        }}
      />

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="relative z-10 h-full w-full rounded-full"
        style={{
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1.2s ease',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
