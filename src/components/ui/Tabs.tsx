import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Underline tabs with counts; scrolls horizontally on small screens. */
export function Tabs<T extends string>({ tabs, value, onChange, label, className }: { tabs: TabItem<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.value === value);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    onChange(next.value);
    ref.current?.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus();
  };
  return (
    <div ref={ref} role="tablist" aria-label={label} onKeyDown={onKey} className={cn('-mb-px flex gap-1 overflow-x-auto border-b border-line scrollbar-none', className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            data-value={t.value}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              'focus-ring relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 pb-2.5 pt-1.5 text-sm font-semibold transition-colors',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {t.label}
            {t.count !== undefined ? <span className={cn('rounded-full px-1.5 py-px text-2xs tabular', active ? 'bg-panel-soft text-panel-ink' : 'bg-surface-3 text-ink-3')}>{t.count}</span> : null}
            <span className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-all', active ? 'bg-panel' : 'bg-transparent')} />
          </button>
        );
      })}
    </div>
  );
}
