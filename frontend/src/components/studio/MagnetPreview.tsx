'use client';

interface MagnetPreviewProps {
  thumbUrl: string | null;
  rows: number;
  cols: number;
  /** Rendered edge length of the whole product, in px */
  size: number;
  uploading?: boolean;
  warning?: boolean;
  className?: string;
}

// A product drawn as physical magnets: one glossy square, or a set split into
// a rows×cols "jigsaw" with hairline gaps — each tile shows its slice of the
// photo, the way the pieces will sit on a fridge.
export default function MagnetPreview({
  thumbUrl, rows, cols, size, uploading, warning, className = '',
}: MagnetPreviewProps) {
  const gap = rows * cols > 1 ? Math.max(2, Math.round(size / 90)) : 0;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        className="grid w-full h-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap,
        }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          return (
            <div
              key={i}
              className="relative overflow-hidden rounded-[2px] bg-ivory shadow-[0_1px_2px_rgba(26,26,24,0.18),0_6px_14px_-4px_rgba(26,26,24,0.28)]"
              style={thumbUrl ? {
                backgroundImage: `url(${thumbUrl})`,
                // each tile shows exactly its 1/cols × 1/rows slice, matching the print split
                backgroundSize: `${cols * 100}% ${rows * 100}%`,
                backgroundPosition: `${cols > 1 ? (c / (cols - 1)) * 100 : 0}% ${rows > 1 ? (r / (rows - 1)) * 100 : 0}%`,
              } : undefined}
            >
              {/* Gloss — a soft diagonal sheen like the printed laminate */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_38%)]" />
            </div>
          );
        })}
      </div>

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/45 rounded-[2px]">
          <svg className="w-7 h-7 text-navy/60 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      )}

      {warning && !uploading && (
        <span
          className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center ring-2 ring-white"
          aria-label="Low resolution photo"
          title="Low resolution photo"
        >
          !
        </span>
      )}
    </div>
  );
}
