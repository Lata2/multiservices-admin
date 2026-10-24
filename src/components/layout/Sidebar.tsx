import { NavLink } from 'react-router';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ACCOUNT_NAV, NAV, type BadgeKey, type NavGroup } from '@/app/navigation';
import { useAdminDashboard } from '@/hooks/queries';
import { useCan, usePanel } from '@/hooks/useAccess';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/ui.store';
import { Logo } from './Logo';

/** Nav groups the signed-in admin can see in the current panel. */
export function useVisibleNav(): NavGroup[] {
  const can = useCan();
  const { panel } = usePanel();
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => (!i.panels || i.panels.includes(panel)) && can(i.permission)) })).filter((g) => g.items.length);
}

function useBadges(): Partial<Record<BadgeKey, number>> {
  const a = useAdminDashboard().data?.attention;
  return a ?? {};
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const groups = useVisibleNav();
  const { to, panel } = usePanel();
  const badges = useBadges();
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <div className="flex h-full flex-col bg-neutral-900 text-white dark:bg-[#080c19]" data-panel={panel}>
      <div className={cn('flex h-16 shrink-0 items-center border-b border-white/8', collapsed ? 'justify-center px-2' : 'px-5')}>
        <NavLink to={to('/')} onClick={onNavigate} className="focus-ring rounded-lg" aria-label="Dashboard">
          <Logo panel={panel} collapsed={collapsed} inverse />
        </NavLink>
      </div>
      <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-none">
        {groups.map((g, gi) => (
          <div key={g.title ?? gi} className={cn(gi > 0 && 'mt-5')}>
            {g.title && !collapsed ? <p className="mb-1.5 px-3 text-xs font-semibold text-white/40">{g.title}</p> : null}
            {g.title && collapsed ? <div className="mx-auto mb-2 h-px w-6 bg-white/10" /> : null}
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const n = item.badge ? badges[item.badge] : 0;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={to(item.path)}
                      end={item.path === '/'}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex h-9.5 items-center gap-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/60',
                          collapsed ? 'justify-center px-0' : 'px-3',
                          isActive ? 'panel-gradient text-white shadow-[0_6px_18px_-6px_var(--panel-solid)]' : 'text-white/65 hover:bg-white/6 hover:text-white',
                        )
                      }
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                      {n ? (
                        collapsed ? (
                          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-400" />
                        ) : (
                          <span className="rounded-full bg-accent-400 px-1.5 py-px text-2xs font-bold text-neutral-900 tabular">{n}</span>
                        )
                      ) : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div className="mt-5 border-t border-white/8 pt-4">
          <ul className="flex flex-col gap-0.5">
            {ACCOUNT_NAV.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={to(item.path)}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => cn('flex h-9 items-center gap-3 rounded-lg text-sm font-medium transition-colors', collapsed ? 'justify-center' : 'px-3', isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/6 hover:text-white')}
                >
                  <item.icon size={17} />
                  {!collapsed ? item.label : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      {onNavigate ? null : (
        <div className="hidden shrink-0 border-t border-white/8 p-3 lg:block">
          <button type="button" onClick={toggle} className={cn('flex h-9 w-full items-center gap-3 rounded-lg text-sm font-medium text-white/55 hover:bg-white/6 hover:text-white focus-visible:outline-2 focus-visible:outline-white/60', collapsed ? 'justify-center' : 'px-3')} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            {!collapsed ? 'Collapse' : null}
          </button>
        </div>
      )}
    </div>
  );
}
