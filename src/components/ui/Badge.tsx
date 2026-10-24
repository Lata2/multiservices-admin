import type { ReactNode } from 'react';
import { toneClasses, type Tone } from '@/config/theme';
import { cn } from '@/lib/cn';

export function Badge({ tone = 'neutral', dot, children, size = 'sm', className, pulse }: { tone?: Tone; dot?: boolean; children: ReactNode; size?: 'xs' | 'sm'; className?: string; pulse?: boolean }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full font-semibold', size === 'xs' ? 'px-2 py-px text-2xs' : 'px-2.5 py-0.5 text-xs', toneClasses[tone].soft, className)}>
      {dot ? <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', toneClasses[tone].dot, pulse && 'animate-pulse-dot')} /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Renders any `{ label, tone }` status meta from `lib/status.ts`. */
export function StatusBadge<K extends string>({ map, value, size }: { map: Record<K, { label: string; tone: Tone }>; value: K; size?: 'xs' | 'sm' }) {
  const m = map[value] ?? { label: value, tone: 'neutral' as Tone };
  return (
    <Badge tone={m.tone} dot size={size}>
      {m.label}
    </Badge>
  );
}
