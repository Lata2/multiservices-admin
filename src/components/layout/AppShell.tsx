import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { createPortal } from 'react-dom';
import { PageLoader } from '@/components/ui';
import { usePanel } from '@/hooks/useAccess';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/ui.store';
import { CommandPalette } from './CommandPalette';
import { SidebarNav } from './Sidebar';
import { Topbar } from './Topbar';

function MobileNav() {
  const { mobileNavOpen, setMobileNav } = useUiStore();
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileNav(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen, setMobileNav]);
  if (!mobileNavOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <div className="absolute inset-0 animate-fade-in bg-overlay" onClick={() => setMobileNav(false)} aria-hidden />
      <div className="relative h-full w-[min(290px,86vw)] animate-drawer-left shadow-lg">
        <SidebarNav onNavigate={() => setMobileNav(false)} />
      </div>
    </div>,
    document.body,
  );
}

/** Sidebar + topbar + content area shared by both panels. */
export function AppShell() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const { panel } = usePanel();
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.dataset.panel = panel;
  }, [panel]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div data-panel={panel} className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-lg">
        Skip to content
      </a>
      <aside aria-label="Sidebar" className={cn('fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-300 ease-[var(--ease-out-soft)] lg:block', collapsed ? 'w-[var(--width-sidebar-collapsed)]' : 'w-[var(--width-sidebar)]')}>
        <SidebarNav collapsed={collapsed} />
      </aside>
      <MobileNav />
      <div className={cn('flex min-h-dvh min-w-0 flex-col transition-[padding] duration-300 ease-[var(--ease-out-soft)]', collapsed ? 'lg:pl-[var(--width-sidebar-collapsed)]' : 'lg:pl-[var(--width-sidebar)]')}>
        <Topbar />
        <main id="main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[var(--container-page)] flex-1 px-3 py-5 outline-none sm:px-5 sm:py-6 lg:px-7 lg:py-7">
          <Suspense fallback={<PageLoader />}>
            <div key={pathname.split('/').slice(0, 3).join('/')} className="animate-rise">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
