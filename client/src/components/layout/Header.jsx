import { cn } from '../../utils/cn.js';

export function Header({ title, subtitle, actions, breadcrumb, className }) {
  return (
    <header className={cn(
      'flex items-center justify-between h-14 px-6 border-b border-zinc-200 bg-white shrink-0',
      className,
    )}>
      <div className="min-w-0">
        {breadcrumb && (
          <p className="text-xs text-zinc-400 mb-0.5 truncate">{breadcrumb}</p>
        )}
        <h1 className="text-sm font-semibold text-zinc-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}

export function HeaderDivider() {
  return <div className="h-5 w-px bg-zinc-200 mx-1" />;
}
