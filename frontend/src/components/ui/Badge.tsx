import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: 'coral' | 'sky' | 'yellow' | 'green' | 'navy';
}

const colors = {
  coral: 'bg-coral-light text-coral',
  sky: 'bg-sky-light text-sky',
  yellow: 'bg-yellow-light text-yellow-700',
  green: 'bg-green-100 text-green-700',
  navy: 'bg-navy/10 text-navy',
};

export function Badge({ color = 'coral', children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={['inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', colors[color], className].join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
