import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bell, ChevronDown, LogOut, MapPin, Menu as MenuIcon, Monitor, Moon, Search, Sun, UserCog } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, IconButton } from '@/components/ui';
import { toneClasses } from '@/config/theme';
import { useNotifications } from '@/hooks/queries';
import { useAdmin, usePanel } from '@/hooks/useAccess';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { authApi, insightsApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore, type ThemeMode } from '@/store/ui.store';
import { qk } from '@/hooks/queryKeys';

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open, close]);
  return ref;
}

function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const q = useNotifications();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { to } = usePanel();
  const unread = q.data?.filter((n) => !n.read).length ?? 0;
  const markAll = async () => {
    await insightsApi.markRead('all');
    void qc.invalidateQueries({ queryKey: qk.notifications });
  };
  return (
    <div ref={ref} className="relative">
      <IconButton icon={Bell} label={`Notifications${unread ? `, ${unread} unread` : ''}`} badge={unread} onClick={() => setOpen((o) => !o)} aria-expanded={open} />
      {open ? (
        <div className="fixed inset-x-3 top-16 z-40 animate-pop-in rounded-2xl border border-line bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold text-ink">Notifications</p>
            {unread ? (
              <button type="button" onClick={markAll} className="focus-ring rounded text-sm font-semibold text-panel-ink hover:underline">
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-96 overflow-y-auto scrollbar-thin">
            {(q.data ?? []).slice(0, 6).map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={async () => {
                    setOpen(false);
                    if (!n.read) {
                      await insightsApi.markRead(n.id);
                      void qc.invalidateQueries({ queryKey: qk.notifications });
                    }
                    if (n.href) navigate(to(n.href.split('?')[0]) + (n.href.includes('?') ? `?${n.href.split('?')[1]}` : ''));
                  }}
                  className="flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : toneClasses.primary.dot)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{n.title}</span>
                    <span className="line-clamp-2 block text-sm text-ink-3">{n.body}</span>
                    <span className="mt-0.5 block text-xs text-ink-3">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
            {q.data && !q.data.length ? <li className="px-4 py-8 text-center text-sm text-ink-3">You’re all caught up.</li> : null}
          </ul>
          <Link to={to('/notifications')} onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-sm font-semibold text-panel-ink hover:bg-surface-2">
            View all
          </Link>
        </div>
      ) : null}
    </div>
  );
}

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function UserMenu() {
  const admin = useAdmin()!;
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const { to } = usePanel();
  const { theme, setTheme } = useUiStore();
  const signOut = useAuthStore((s) => s.signOut);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    signOut();
    qc.clear();
    navigate('/login', { replace: true });
  };
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="focus-ring flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-surface-3">
        <Avatar name={admin.name} src={admin.avatar} size="sm" />
        <span className="hidden min-w-0 text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-sm font-semibold text-ink">{admin.name}</span>
          <span className="block max-w-36 truncate text-xs text-ink-3">{admin.role.name}</span>
        </span>
        <ChevronDown size={14} className="hidden text-ink-3 md:block" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 animate-pop-in rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
          <div className="px-2.5 py-2">
            <p className="truncate font-semibold text-ink">{admin.name}</p>
            <p className="truncate text-sm text-ink-3">{admin.email}</p>
          </div>
          <Link role="menuitem" to={to('/profile')} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-3 hover:text-ink">
            <UserCog size={15} /> Profile & security
          </Link>
          <div className="my-1 border-t border-line" />
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-ink-3">Appearance</p>
          <div className="mx-1.5 mb-1.5 grid grid-cols-3 gap-1 rounded-lg bg-surface-3 p-0.5">
            {THEMES.map((t) => (
              <button key={t.value} type="button" aria-pressed={theme === t.value} onClick={() => setTheme(t.value)} className={cn('flex h-7 items-center justify-center gap-1 rounded-md text-xs font-semibold', theme === t.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink')}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
          <div className="my-1 border-t border-line" />
          <button role="menuitem" type="button" onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Topbar() {
  const admin = useAdmin()!;
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const setCommand = useUiStore((s) => s.setCommand);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header data-topbar className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:gap-3 sm:px-5 lg:px-7">
      <IconButton icon={MenuIcon} label="Open menu" className="lg:hidden" onClick={() => setMobileNav(true)} />
      <button
        type="button"
        onClick={() => setCommand(true)}
        className="focus-ring flex h-9.5 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink-3 transition-colors hover:border-line-strong sm:max-w-sm"
      >
        <Search size={15} className="shrink-0" />
        <span className="truncate">Search pages, bookings…</span>
        <kbd className="ml-auto hidden rounded border border-line bg-surface px-1.5 py-px font-sans text-2xs font-semibold text-ink-3 sm:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {admin.cityScope.length ? (
          <Badge tone="accent" className="hidden md:inline-flex">
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {admin.cityScope.join(', ')}
            </span>
          </Badge>
        ) : null}
        <span className="hidden items-center rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-2xs font-semibold text-ink-3 xl:inline-flex" title="Demo mode: mock data and simulated authentication — not real security">
          Demo mode
        </span>
        <NotificationsPopover />
        <UserMenu />
      </div>
    </header>
  );
}
