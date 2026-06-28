import { cn } from '../../utils/cn.js';

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-8 text-center',
      className,
    )}>
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center mb-4 text-zinc-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-zinc-800 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
