import { cn } from '../../utils/cn.js';

export function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-zinc-200 rounded',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lines - 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </div>
  );
}
