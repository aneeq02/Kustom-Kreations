'use client';

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect } from 'react-konva';
import Konva from 'konva';
import type { PhotoState } from '@/components/designer/DesignerCanvas';

export interface TiledCanvasHandle {
  exportThumbnail: () => string | null;
}

interface Props {
  photoUrl: string;
  rows: number;
  cols: number;
  canvasSize: number;
  photoState: PhotoState;
  onPhotoChange: (p: PhotoState) => void;
  onPhotoLoad?: () => void;
}

function useHTMLImage(src: string | null, onLoad?: () => void) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const el = new window.Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => {
      setImg(el);
      onLoad?.();
    };
    el.onerror = () => setImg(null);
    el.src = src;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  return img;
}

const TiledCanvas = forwardRef<TiledCanvasHandle, Props>(function TiledCanvas(
  { photoUrl, rows, cols, canvasSize, photoState, onPhotoChange, onPhotoLoad },
  ref,
) {
  const stageRef = useRef<Konva.Stage>(null);
  const photoImg = useHTMLImage(photoUrl || null, onPhotoLoad);

  const coverScale = photoImg
    ? Math.max(canvasSize / photoImg.naturalWidth, canvasSize / photoImg.naturalHeight)
    : 1;

  const displayW = (photoImg?.naturalWidth ?? 400) * photoState.scale;
  const displayH = (photoImg?.naturalHeight ?? 400) * photoState.scale;

  const tileW = canvasSize / cols;
  const tileH = canvasSize / rows;

  useImperativeHandle(ref, () => ({
    exportThumbnail: () => stageRef.current?.toDataURL({ pixelRatio: 1 }) ?? null,
  }));

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onPhotoChange({ ...photoState, x: e.target.x(), y: e.target.y() });
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const factor = e.evt.deltaY < 0 ? 1.05 : 0.95;
    onPhotoChange({
      ...photoState,
      scale: Math.min(
        Math.max(photoState.scale * factor, coverScale * 0.5),
        coverScale * 5,
      ),
    });
  };

  const showGrid = rows > 1 || cols > 1;

  return (
    <div
      className="relative rounded-[18px] overflow-hidden shadow-2xl border-4 border-white/10"
      style={{ width: canvasSize, height: canvasSize }}
    >
      <Stage ref={stageRef} width={canvasSize} height={canvasSize} onWheel={handleWheel}>
        {/* Photo layer — clipped to canvas, draggable */}
        <Layer clip={{ x: 0, y: 0, width: canvasSize, height: canvasSize }}>
          {photoImg && (
            <KonvaImage
              image={photoImg}
              x={photoState.x}
              y={photoState.y}
              width={displayW}
              height={displayH}
              offsetX={displayW / 2}
              offsetY={displayH / 2}
              rotation={photoState.rotation}
              draggable
              onDragEnd={handleDragEnd}
            />
          )}
        </Layer>

        {/* Grid overlay — non-interactive */}
        {showGrid && (
          <Layer listening={false}>
            {Array.from({ length: cols - 1 }, (_, i) => (
              <Line
                key={`v${i}`}
                points={[(i + 1) * tileW, 0, (i + 1) * tileW, canvasSize]}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={2}
                shadowColor="rgba(0,0,0,0.5)"
                shadowBlur={4}
                shadowOffsetX={0}
                shadowOffsetY={0}
              />
            ))}
            {Array.from({ length: rows - 1 }, (_, i) => (
              <Line
                key={`h${i}`}
                points={[0, (i + 1) * tileH, canvasSize, (i + 1) * tileH]}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={2}
                shadowColor="rgba(0,0,0,0.5)"
                shadowBlur={4}
                shadowOffsetX={0}
                shadowOffsetY={0}
              />
            ))}
            <Rect
              x={1} y={1}
              width={canvasSize - 2}
              height={canvasSize - 2}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1}
              fill="transparent"
            />
          </Layer>
        )}
      </Stage>

      {/* Empty state placeholder */}
      {!photoImg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ivory/80 pointer-events-none">
          <svg
            className="w-12 h-12 text-coral/30 mb-3"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p className="text-sm font-semibold text-text-secondary">Upload a photo to begin</p>
          {rows > 1 && (
            <p className="text-xs text-text-secondary mt-1 opacity-70">
              It will be split into {rows * cols} magnets
            </p>
          )}
        </div>
      )}

      {photoImg && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-3 py-1 rounded-full pointer-events-none select-none whitespace-nowrap">
          Drag · Scroll to zoom
        </div>
      )}
    </div>
  );
});

export default TiledCanvas;
