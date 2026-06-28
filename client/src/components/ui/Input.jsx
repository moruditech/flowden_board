import { forwardRef } from 'react';
import { cn } from '../../utils/cn.js';

export const Input = forwardRef(function Input(
  { label, error, helper, id, className, required, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-zinc-600 tracking-wide">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        className={cn(
          'w-full h-9 px-3 text-sm text-zinc-900 bg-white',
          'border rounded outline-none',
          'placeholder:text-zinc-400',
          'transition-colors duration-100',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-zinc-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
          'disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />

      {error  && <p className="text-xs text-red-600">{error}</p>}
      {helper && !error && <p className="text-xs text-zinc-500">{helper}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, helper, id, rows = 3, className, ...props },
  ref
) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-medium text-zinc-600 tracking-wide">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={cn(
          'w-full px-3 py-2 text-sm text-zinc-900 bg-white',
          'border rounded outline-none resize-none',
          'placeholder:text-zinc-400',
          'transition-colors duration-100',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
            : 'border-zinc-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
          className,
        )}
        {...props}
      />

      {error  && <p className="text-xs text-red-600">{error}</p>}
      {helper && !error && <p className="text-xs text-zinc-500">{helper}</p>}
    </div>
  );
});

export function Select({ label, error, id, children, className, ...props }) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-zinc-600 tracking-wide">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full h-9 px-3 text-sm text-zinc-900 bg-white',
          'border border-zinc-300 rounded outline-none',
          'focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
          'transition-colors duration-100',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
