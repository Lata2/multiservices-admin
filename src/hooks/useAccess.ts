import { useCallback } from 'react';
import { can } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth.store';
import type { Panel, Permission } from '@/types/admin';

/** Permission checker for the signed-in admin (UI convenience only — the API enforces). */
export function useCan() {
  const perms = useAuthStore((s) => s.admin?.role.permissions);
  return useCallback((p?: Permission | Permission[]) => can(perms, p), [perms]);
}

export function useAdmin() {
  return useAuthStore((s) => s.admin);
}

export const panelBase = (panel: Panel) => (panel === 'super' ? '/super' : '/admin');

/** Current panel + a helper to build panel-relative links (`to('/bookings')` → `/admin/bookings`). */
export function usePanel() {
  const panel = useAuthStore((s) => s.admin?.panel ?? 'admin');
  const base = panelBase(panel);
  const to = useCallback((path: string) => `${base}${path === '/' ? '' : path}`, [base]);
  return { panel, base, to };
}
