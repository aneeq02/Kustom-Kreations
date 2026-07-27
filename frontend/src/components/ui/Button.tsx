'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary: 'bg-coral text-navy hover:bg-coral/80 active:scale-[0.98] shadow-sm',
  secondary: 'bg-sky text-navy hover:bg-sky/80 active:scale-[0.98]',
  outline: 'border-2 border-coral text-navy hover:bg-coral-light active:scale-[0.98]',
  ghost: 'text-navy hover:bg-navy/8 active:scale-[0.98]',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]',
};

const sizes = {
  sm: 'px-4 py-2 text-sm rounded-xl min-h-[36px]',
  md: 'px-6 py-3 text-base rounded-[14px] min-h-[44px]',
  lg: 'px-8 py-4 text-lg rounded-2xl min-h-[52px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  children,
  disabled,
  className = '',
  ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={[
      'inline-flex items-center justify-center gap-2 font-semibold',
      'transition-all duration-150 cursor-pointer select-none',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
      variants[variant],
      sizes[size],
      fullWidth ? 'w-full' : '',
      className,
    ].join(' ')}
    {...props}
  >
    {loading && (
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    )}
    {children}
  </button>
));
Button.displayName = 'Button';
