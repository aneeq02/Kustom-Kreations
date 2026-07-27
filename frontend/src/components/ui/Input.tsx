import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, className = '', id, ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-navy">
          {label}
          {props.required && <span className="text-coral ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          'w-full px-4 py-3 rounded-xl border-2 bg-white',
          'text-navy placeholder:text-text-secondary',
          'transition-colors duration-150 min-h-[44px]',
          error
            ? 'border-red-400 focus:border-red-500 focus:outline-none'
            : 'border-coral-light focus:border-coral focus:outline-none',
          className,
        ].join(' ')}
        {...props}
      />
      {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';
