import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ShieldOff } from 'lucide-react';
import { EmptyState, LinkButton } from '@/components/ui';
import { panelBase, useCan, usePanel } from '@/hooks/useAccess';
import { useAuthStore } from '@/store/auth.store';
import type { Panel, Permission } from '@/types/admin';

/** Redirects to /login (remembering where to return) when signed out. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const loc = useLocation();
  if (!token) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <>{children}</>;
}

/** Keeps each admin inside their own panel (/admin vs /super). */
export function RequirePanel({ panel, children }: { panel: Panel; children: ReactNode }) {
  const admin = useAuthStore((s) => s.admin);
  const loc = useLocation();
  if (admin && admin.panel !== panel) {
    const rest = loc.pathname.replace(/^\/(admin|super)/, '');
    return <Navigate to={`${panelBase(admin.panel)}${rest}${loc.search}`} replace />;
  }
  return <>{children}</>;
}

export function Forbidden() {
  const { to } = usePanel();
  return (
    <EmptyState
      icon={ShieldOff}
      title="You don’t have access to this page"
      description="Your role doesn’t include this permission. Ask a Super Admin if you need it."
      action={
        <LinkButton to={to('/')} variant="outline" size="sm">
          Back to dashboard
        </LinkButton>
      }
    />
  );
}

export function RequirePermission({ permission, children }: { permission?: Permission | Permission[]; children: ReactNode }) {
  const can = useCan();
  return can(permission) ? <>{children}</> : <Forbidden />;
}
