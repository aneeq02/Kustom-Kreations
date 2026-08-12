'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface ResponsiveCanvasStageProps {
  size: number;
  hidden?: boolean;
  children: ReactNode;
}

// Wraps a fixed-size (e.g. 360x360) Konva editor so it visually scales down
// to fit narrow viewports. photoState/cropData and the backend's print
// pipeline all assume a fixed `size`-based coordinate system, so we only
// ever scale the on-screen presentation via CSS transform — Konva reads the
// container's actual rendered rect for pointer mapping, so drag/zoom stay
// accurate at any scale.
export default function ResponsiveCanvasStage({ size, hidden, children }: ResponsiveCanvasStageProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const available = window.innerWidth - 32; // matches the page's px-4 edge padding
      setScale(available > 0 ? Math.min(1, available / size) : 1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [size]);

  return (
    <div style={{ width: size * scale, height: size * scale, display: hidden ? 'none' : 'block' }}>
      <div style={{ width: size, height: size, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
