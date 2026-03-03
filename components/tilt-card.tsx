'use client';

import { useCallback, useRef } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A card wrapper that responds to mouse movement with a 3D tilt effect
 * and a dynamic radial glow that follows the cursor.
 */
export function TiltCard({ children, className = '', style }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const tiltX = (y - 0.5) * -12; // degrees
    const tiltY = (x - 0.5) * 12;

    el.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px) scale(1.02)`;
    el.style.setProperty('--glow-x', `${x * 100}%`);
    el.style.setProperty('--glow-y', `${y * 100}%`);
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 350ms ease',
        willChange: 'transform',
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* Dynamic glow that follows cursor position */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: 'radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(229, 62, 62, 0.15), transparent 60%)',
          pointerEvents: 'none',
          opacity: 0.8,
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
