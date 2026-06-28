import { useUiStore } from '../../store/uiStore.js';
import { cn } from '../../utils/cn.js';

const HamburgerIcon = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export function Header({ title, subtitle, actions, breadcrumb, className }) {
  const { toggleSidebar } = useUiStore();

  return (
    <header className={cn(
      'flex items-center justify-between h-14 px-4 md:px-6 border-b border-zinc-200 bg-white shrink-0',
      className,
    )}>
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggleSidebar}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors shrink-0"
          aria-label="Open sidebar"
        >
          {HamburgerIcon}
        </button>

        <div className="min-w-0">
          {breadcrumb && (
            <p className="text-xs text-zinc-400 mb-0.5 truncate">{breadcrumb}</p>
          )}
          <h1 className="text-sm font-semibold text-zinc-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
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
