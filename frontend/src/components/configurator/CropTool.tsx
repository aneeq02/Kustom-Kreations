'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { CropData } from '@/types';

interface CropToolProps {
  imageUrl: string;
  initialCrop?: Partial<CropData>;
  onCropChange: (crop: CropData) => void;
}

const DEFAULT_CROP: CropData = { x: 0, y: 0, width: 1, height: 1, scale: 1, rotation: 0 };

export default function CropTool({ imageUrl, initialCrop, onCropChange }: CropToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<CropData>({ ...DEFAULT_CROP, ...initialCrop });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  // Keep callback in a ref so it's never a useEffect dependency — avoids an
  // infinite loop caused by inline arrow functions re-creating on every render.
  const onCropChangeRef = useRef(onCropChange);
  onCropChangeRef.current = onCropChange;

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  useEffect(() => {
    onCropChangeRef.current(crop);
  }, [crop]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = 'touches' in e ? e.touches[0] : e;
    dragStart.current = { mx: point.clientX, my: point.clientY, ox: crop.x, oy: crop.y };
    setDragging(true);
  };

  const onMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging || !dragStart.current || !containerRef.current) return;
    const point = 'touches' in e ? (e as TouchEvent).touches[0] : e as MouseEvent;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (point.clientX - dragStart.current.mx) / rect.width;
    const dy = (point.clientY - dragStart.current.my) / rect.height;

    setCrop(c => ({
      ...c,
      x: clamp(dragStart.current!.ox - dx, -0.5, 0.5),
      y: clamp(dragStart.current!.oy - dy, -0.5, 0.5),
    }));
  }, [dragging]);

  const stopDrag = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [onMove, stopDrag]);

  const bgPosition = `${50 + crop.x * 100}% ${50 + crop.y * 100}%`;
  const bgSize = `${crop.scale * 100}%`;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Preview square */}
      <div
        ref={containerRef}
        className="relative w-56 h-56 rounded-[18px] overflow-hidden shadow-lg border-4 border-white cursor-grab active:cursor-grabbing select-none"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: bgSize,
          backgroundPosition: bgPosition,
          backgroundRepeat: 'no-repeat',
          transform: `rotate(${crop.rotation}deg)`,
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        {/* Overlay grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '33.33% 33.33%',
          }}
        />
        <div className="absolute bottom-2 left-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
          Drag to reposition
        </div>
      </div>

      {/* Scale slider */}
      <div className="w-full max-w-xs">
        <label className="text-xs font-semibold text-text-secondary mb-1 block">Zoom</label>
        <input
          type="range"
          min="50" max="200" step="1"
          value={Math.round(crop.scale * 100)}
          onChange={e => setCrop(c => ({ ...c, scale: parseInt(e.target.value) / 100 }))}
          className="w-full accent-coral"
        />
      </div>

      {/* Rotation */}
      <div className="w-full max-w-xs">
        <label className="text-xs font-semibold text-text-secondary mb-1 block">Rotation</label>
        <input
          type="range"
          min="-45" max="45" step="1"
          value={crop.rotation}
          onChange={e => setCrop(c => ({ ...c, rotation: parseInt(e.target.value) }))}
          className="w-full accent-coral"
        />
      </div>

      <button
        onClick={() => setCrop(DEFAULT_CROP)}
        className="text-xs text-coral hover:underline"
      >
        Reset
      </button>
    </div>
  );
}
