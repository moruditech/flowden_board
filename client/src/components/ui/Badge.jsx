import { cn } from '../../utils/cn.js';

const variants = {
  default: 'bg-zinc-100  text-zinc-700',
  brand:   'bg-brand-100 text-brand-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100   text-red-700',
  owner:   'bg-amber-100 text-amber-800',
  admin:   'bg-cyan-100  text-cyan-800',
  member:  'bg-zinc-100  text-zinc-600',
};

export function Badge({ children, variant = 'default', className }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      variants[variant],
      className,
    )}>
      {children}
    </span>
  );
}

const roleVariant = { owner: 'owner', admin: 'admin', member: 'member' };

export function RoleBadge({ role }) {
  return <Badge variant={roleVariant[role] || 'default'}>{role}</Badge>;
}
