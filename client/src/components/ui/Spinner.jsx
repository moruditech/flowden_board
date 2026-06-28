import { cn } from '../../utils/cn.js';

const sizes = {
  xs:  'w-3 h-3  border-[1.5px]',
  sm:  'w-4 h-4  border-2',
  md:  'w-5 h-5  border-2',
  lg:  'w-6 h-6  border-[2.5px]',
  xl:  'w-8 h-8  border-[3px]',
};

export function Spinner({ size = 'md', className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block rounded-full border-current border-t-transparent animate-spin',
        sizes[size],
        className,
      )}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" className="text-brand-600" />
    </div>
  );
}
