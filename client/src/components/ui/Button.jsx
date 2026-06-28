import { cn } from '../../utils/cn.js';
import { Spinner } from './Spinner.jsx';

const variants = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 border-transparent',
  secondary: 'bg-white text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 border-zinc-300',
  ghost:     'bg-transparent text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 border-transparent',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border-transparent',
  outline:   'bg-transparent text-brand-700 hover:bg-brand-50 active:bg-brand-100 border-brand-600',
};

const sizes = {
  xs: 'h-7  px-2.5 text-xs  gap-1.5',
  sm: 'h-8  px-3   text-sm  gap-2',
  md: 'h-9  px-4   text-sm  gap-2',
  lg: 'h-10 px-5   text-base gap-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size    = 'md',
  loading = false,
  disabled = false,
  className,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium border rounded',
        'transition-colors duration-100 select-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner size="xs" className="text-current" />}
      {children}
    </button>
  );
}
