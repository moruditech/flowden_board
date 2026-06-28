import { cn } from '../../utils/cn.js';

const sizes = {
  xs:  'w-5 h-5 text-2xs',
  sm:  'w-6 h-6 text-xs',
  md:  'w-8 h-8 text-sm',
  lg:  'w-10 h-10 text-base',
  xl:  'w-12 h-12 text-lg',
};

const palette = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-rose-100 text-rose-700',
  'bg-lime-100 text-lime-700',
];

function colorFromName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export function Avatar({ name, src, size = 'md', className }) {
  const colorClass = colorFromName(name);

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none',
        sizes[size],
        !src && colorClass,
        className,
      )}
      title={name}
    >
      {src
        ? <img src={src} alt={name} className={cn('w-full h-full rounded-full object-cover', sizes[size])} />
        : initials(name)
      }
    </span>
  );
}

export function AvatarGroup({ users = [], max = 3, size = 'sm' }) {
  const visible  = users.slice(0, max);
  const overflow = users.length - max;
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((u) => (
        <Avatar key={u.id} name={u.name} src={u.avatarUrl} size={size}
          className="ring-2 ring-white" />
      ))}
      {overflow > 0 && (
        <span className={cn(
          'inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-white',
          'bg-zinc-100 text-zinc-600',
          sizes[size],
        )}>
          +{overflow}
        </span>
      )}
    </div>
  );
}
