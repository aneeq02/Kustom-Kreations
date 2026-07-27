interface QualityBadgeProps {
  status: 'good' | 'warn' | 'blocked';
  message: string;
  dpi: number;
}

export default function QualityBadge({ status, message, dpi }: QualityBadgeProps) {
  const styles = {
    good: 'bg-green-50 border-green-200 text-green-800',
    warn: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    blocked: 'bg-red-50 border-red-300 text-red-800',
  };
  const icons = { good: '✅', warn: '⚠️', blocked: '🚫' };

  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-sm ${styles[status]}`}>
      <span className="shrink-0 mt-0.5">{icons[status]}</span>
      <div>
        <p className="font-semibold">{status === 'good' ? 'Great quality!' : status === 'warn' ? 'Quality warning' : 'Photo too low quality'}</p>
        <p className="text-xs mt-0.5 opacity-80">{message}</p>
        <p className="text-xs mt-0.5 opacity-60">{dpi} DPI</p>
      </div>
    </div>
  );
}
