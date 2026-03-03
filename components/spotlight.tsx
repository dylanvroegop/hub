'use client';

import { useEffect, useRef } from 'react';

/**
 * Mouse-follow radial spotlight overlay.
 * Renders a large soft glow that tracks the cursor inside .main-wrap.
 */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    function onMove(e: MouseEvent) {
      const rect = parent!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el!.style.setProperty('--spot-x', `${x}px`);
      el!.style.setProperty('--spot-y', `${y}px`);
      el!.style.opacity = '1';
    }

    function onLeave() {
      el!.style.opacity = '0';
    }

    parent.addEventListener('mousemove', onMove);
    parent.addEventListener('mouseleave', onLeave);
    return () => {
      parent.removeEventListener('mousemove', onMove);
      parent.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 0,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        transition: 'opacity 0.4s ease',
        background:
          'radial-gradient(600px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(229, 62, 62, 0.06), transparent 60%)',
      }}
    />
  );
}
