/**
 * Mock "server" utilities: transport, auth context, permission enforcement,
 * city scoping, pagination and audit logging. These mirror what the real
 * backend must do — the UI's own checks are convenience only.
 */
import { env } from '@/config/env';
import { db, persistDb } from '@/mocks/db';
import { fakeIp, uid } from '@/mocks/helpers';
import { panelForRole } from '@/lib/permissions';
import type { AdminNotification, AuditLog, ListParams, Paginated, Permission, SessionAdmin } from '@/types/admin';
import { ApiError } from '../http';
import { session } from '../session';

export async function mock<T>(handler: () => T, opts: { write?: boolean; latency?: number } = {}): Promise<T> {
  const latency = opts.latency ?? env.mockLatency;
  if (latency > 0) await new Promise((r) => setTimeout(r, latency * (0.6 + Math.random() * 0.8)));
  const result = handler();
  if (opts.write) persistDb();
  return result === undefined ? result : (JSON.parse(JSON.stringify(result)) as T);
}

export function currentAdmin(): SessionAdmin {
  const admin = db.admins.find((a) => a.id === session.adminId);
  if (!session.token || !admin) throw new ApiError('Your session has expired. Please sign in again.', 401, 'UNAUTHENTICATED');
  if (admin.status === 'suspended') throw new ApiError('Your account has been suspended.', 401, 'UNAUTHENTICATED');
  const role = db.roles.find((r) => r.id === admin.roleId);
  if (!role) throw new ApiError('Your role no longer exists. Contact a Super Admin.', 403, 'FORBIDDEN');
  return { ...admin, role, panel: panelForRole(role) };
}

/** Throws 403 unless the signed-in admin holds at least one of the permissions. */
export function requirePerm(...perms: Permission[]): SessionAdmin {
  const me = currentAdmin();
  if (!perms.some((p) => me.role.permissions.includes(p))) throw new ApiError('You don’t have permission to do that.', 403, 'FORBIDDEN');
  return me;
}

/** Cities the admin may see, or null for all cities. */
export function scopeCities(): string[] | null {
  const me = currentAdmin();
  return me.cityScope.length ? me.cityScope : null;
}
export const inScope = (city: string | undefined, scope = scopeCities()) => !scope || (!!city && scope.includes(city));

export function notFound(what: string): never {
  throw new ApiError(`${what} not found`, 404, 'NOT_FOUND');
}

export function audit(action: string, entity: string, summary: string, entityId?: string, severity: AuditLog['severity'] = 'info') {
  let actor: SessionAdmin | null = null;
  try {
    actor = currentAdmin();
  } catch {
    /* system action */
  }
  db.auditLogs.unshift({
    id: uid('al'),
    actorId: actor?.id ?? 'system',
    actorName: actor?.name ?? 'System',
    actorRole: actor?.role.name ?? 'System',
    action,
    entity,
    entityId,
    summary,
    severity,
    ip: fakeIp(),
    at: new Date().toISOString(),
  });
  if (db.auditLogs.length > 1000) db.auditLogs.length = 1000;
}

export function pushAdminNotification(n: Omit<AdminNotification, 'id' | 'read' | 'createdAt'>) {
  db.notifications.unshift({ ...n, id: uid('an'), read: false, createdAt: new Date().toISOString() });
}

type Sorter<T> = (row: T) => string | number;

/** Server-style search + sort + paginate. */
export function paginate<T>(rows: T[], params: Partial<ListParams>, opts: { search?: (row: T) => string; sorters?: Record<string, Sorter<T>>; defaultSort?: string; defaultDir?: 'asc' | 'desc' } = {}): Paginated<T> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
  let list = rows;
  const q = params.search?.trim().toLowerCase();
  if (q && opts.search) list = list.filter((r) => opts.search!(r).toLowerCase().includes(q));
  const sortKey = params.sort ?? opts.defaultSort;
  const sorter = sortKey ? opts.sorters?.[sortKey] : undefined;
  if (sorter) {
    const dir = (params.sort ? params.dir : opts.defaultDir) === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      const va = sorter(a);
      const vb = sorter(b);
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * dir;
    });
  }
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  return { items: list.slice((safePage - 1) * pageSize, safePage * pageSize), total, page: safePage, pageSize, pageCount };
}

export const assert = (cond: unknown, message: string, status = 400): void => {
  if (!cond) throw new ApiError(message, status);
};
