import { useState } from 'react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const palette = [
  'bg-primary-100 text-primary-700',
  'bg-accent-100 text-accent-700',
  'bg-success-100 text-success-700',
  'bg-highlight-100 text-highlight-700',
  'bg-info-100 text-info-700',
  'bg-danger-100 text-danger-700',
];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const sizes = { xs: 'h-6 w-6 text-2xs', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' };

export function Avatar({ name, src, size = 'sm', className, square }: { name: string; src?: string; size?: keyof typeof sizes; className?: string; square?: boolean }) {
  const [failed, setFailed] = useState(false);
  const shape = square ? 'rounded-xl' : 'rounded-full';
  if (src && !failed)
    return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={cn('shrink-0 object-cover ring-2 ring-surface', shape, sizes[size], className)} />;
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 select-none items-center justify-center font-bold ring-2 ring-surface', shape, sizes[size], palette[hash(name) % palette.length], className)}>
      {initials(name) || '?'}
    </span>
  );
}

/** Avatar + name + secondary line, used in table cells and lists. */
export function PersonCell({ name, sub, src, size = 'sm', square }: { name: string; sub?: string; src?: string; size?: 'xs' | 'sm' | 'md'; square?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} src={src} size={size} square={square} />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{name}</span>
        {sub ? <span className="block truncate text-xs text-ink-3">{sub}</span> : null}
      </span>
    </span>
  );
}
