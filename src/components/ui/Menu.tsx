import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  tone?: 'danger';
  disabled?: boolean;
  hidden?: boolean;
}

/** Accessible dropdown menu (click / keyboard), closes on outside click & Escape. */
export function Menu({ items, trigger, label = 'More actions', align = 'end' }: { items: MenuItem[]; trigger?: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; 'aria-controls': string }) => ReactNode; label?: string; align?: 'start' | 'end' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els = [...(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not([disabled])') ?? [])];
        const i = els.indexOf(document.activeElement as HTMLElement);
        els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    setTimeout(() => ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus(), 10);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!visible.length) return null;
  const triggerProps = { onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' as const, 'aria-controls': id };
  return (
    <div ref={ref} className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      {trigger ? trigger(triggerProps) : <IconButton icon={MoreHorizontal} label={label} size="sm" {...triggerProps} />}
      {open ? (
        <div id={id} role="menu" className={cn('absolute top-full z-40 mt-1.5 min-w-48 animate-pop-in rounded-xl border border-line bg-surface p-1 shadow-lg', align === 'end' ? 'right-0' : 'left-0')}>
          {visible.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium outline-none transition-colors disabled:opacity-40',
                it.tone === 'danger' ? 'text-danger-600 hover:bg-danger-50 focus:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10 dark:focus:bg-danger-500/10' : 'text-ink-2 hover:bg-surface-3 hover:text-ink focus:bg-surface-3',
              )}
            >
              {it.icon ? <it.icon size={15} /> : null}
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
