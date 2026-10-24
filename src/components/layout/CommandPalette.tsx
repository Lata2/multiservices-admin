import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { CornerDownLeft, Receipt, Search } from 'lucide-react';
import { ACCOUNT_NAV, type NavItem } from '@/app/navigation';
import { useCan, usePanel } from '@/hooks/useAccess';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/ui.store';
import { useVisibleNav } from './Sidebar';

type Entry = { id: string; label: string; group: string; icon: NavItem['icon']; go: () => void };

/** ⌘K / Ctrl+K quick navigation + booking lookup. */
export function CommandPalette() {
  const { commandOpen: open, setCommand } = useUiStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommand(!useUiStore.getState().commandOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCommand]);
  return open ? <Palette /> : null;
}

function Palette() {
  const setCommand = useUiStore((s) => s.setCommand);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const nav = useVisibleNav();
  const { to } = usePanel();
  const can = useCan();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const entries = useMemo<Entry[]>(() => {
    const close = (path: string) => () => {
      setCommand(false);
      navigate(path);
    };
    const pages: Entry[] = [...nav.flatMap((g) => g.items.map((i) => ({ i, group: g.title ?? 'Overview' }))), ...ACCOUNT_NAV.map((i) => ({ i, group: 'Account' }))]
      .filter(({ i }) => !q || `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(q.toLowerCase()))
      .map(({ i, group }) => ({ id: i.path, label: i.label, group, icon: i.icon, go: close(to(i.path)) }));
    const term = q.trim();
    const extra: Entry[] = [];
    if (term.length >= 3 && can('bookings.view')) extra.push({ id: 'bk', label: `Search bookings for “${term}”`, group: 'Search', icon: Receipt, go: close(`${to('/bookings')}?q=${encodeURIComponent(term)}`) });
    return [...pages, ...extra];
  }, [nav, q, to, navigate, setCommand, can]);

  const choose = (i: number) => entries[i]?.go();

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-3 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-overlay backdrop-blur-[2px]" onClick={() => setCommand(false)} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Command menu" className="relative w-full max-w-lg animate-pop-in overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={17} className="text-ink-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, entries.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') choose(idx);
              else if (e.key === 'Escape') setCommand(false);
            }}
            placeholder="Go to a page or search a booking code…"
            aria-label="Search"
            className="h-13 flex-1 bg-transparent text-md text-ink outline-none placeholder:text-ink-3"
          />
          <kbd className="rounded border border-line px-1.5 text-2xs font-semibold text-ink-3">Esc</kbd>
        </div>
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5 scrollbar-thin">
          {entries.map((e, i) => (
            <li key={e.id} role="option" aria-selected={i === idx}>
              <button
                type="button"
                onMouseEnter={() => setIdx(i)}
                onClick={() => choose(i)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm', i === idx ? 'bg-panel-soft text-panel-ink' : 'text-ink-2')}
              >
                <e.icon size={16} />
                <span className="flex-1 font-medium">{e.label}</span>
                <span className="text-xs text-ink-3">{e.group}</span>
                {i === idx ? <CornerDownLeft size={14} /> : null}
              </button>
            </li>
          ))}
          {!entries.length ? <li className="px-3 py-8 text-center text-sm text-ink-3">No matches for “{q}”.</li> : null}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
