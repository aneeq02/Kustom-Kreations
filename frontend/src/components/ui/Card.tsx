import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
};

export function Card({ padding = 'md', hover, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-2xl shadow-sm border border-coral-light/40',
        hover ? 'transition-shadow duration-200 hover:shadow-md' : '',
        paddings[padding],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
