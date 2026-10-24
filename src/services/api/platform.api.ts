import { env } from '@/config/env';
import { db, resetDb } from '@/mocks/db';
import { uid } from '@/mocks/helpers';
import { SUPER_ONLY, SUPER_ROLE_ID } from '@/lib/permissions';
import type { AdminRole, AdminStatus, AdminUser, AppVersionConfig, AuditLog, FeatureFlag, ListParams, Paginated, Permission, PlatformSettings, SystemService } from '@/types/admin';
import type { City } from '@/types/models';
import { ApiError, http } from '../http';
import { assert, audit, currentAdmin, mock, notFound, paginate, requirePerm } from '../mock/server';

export type AdminInput = Pick<AdminUser, 'name' | 'email' | 'phone' | 'roleId' | 'cityScope'>;
export type RoleInput = Pick<AdminRole, 'name' | 'description' | 'permissions' | 'color'>;
export type CityInput = Pick<City, 'name' | 'state' | 'radiusKm' | 'active'>;

export interface AuditFilters extends Partial<ListParams> {
  severity?: AuditLog['severity'];
  actorId?: string;
  entity?: string;
  days?: number;
}

export interface Lookups {
  cities: { id: string; name: string; active: boolean }[];
  categories: { id: string; name: string; parentId: string | null; icon: string }[];
  providers: { id: string; name: string; city: string; categoryIds: string[]; status: string }[];
  partners: { id: string; name: string; city: string; status: string; online: boolean }[];
  admins: { id: string; name: string; roleId: string }[];
}

export interface PlatformApi {
  lookups(): Promise<Lookups>;
  admins(f: Partial<ListParams> & { status?: AdminStatus | 'all'; roleId?: string }): Promise<Paginated<AdminUser>>;
  saveAdmin(input: AdminInput, id?: string): Promise<AdminUser>;
  setAdminStatus(id: string, status: AdminStatus): Promise<AdminUser>;
  deleteAdmin(id: string): Promise<{ ok: true }>;
  resendInvite(id: string): Promise<{ ok: true }>;
  roles(): Promise<(AdminRole & { members: number })[]>;
  saveRole(input: RoleInput, id?: string): Promise<AdminRole>;
  deleteRole(id: string): Promise<{ ok: true }>;
  settings(): Promise<PlatformSettings>;
  updateSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings>;
  cities(): Promise<(City & { providers: number; partners: number; customers: number; bookings30: number })[]>;
  saveCity(input: CityInput, id?: string): Promise<City>;
  audit(f: AuditFilters): Promise<Paginated<AuditLog>>;
  system(): Promise<{ services: SystemService[]; flags: FeatureFlag[]; versions: AppVersionConfig[]; maintenanceMode: boolean; maintenanceMessage: string; dbSize: number; seededAt: string }>;
  saveFlag(key: string, patch: Partial<Pick<FeatureFlag, 'enabled' | 'rollout' | 'audience'>>): Promise<FeatureFlag>;
  saveVersion(app: AppVersionConfig['app'], platform: AppVersionConfig['platform'], patch: Partial<Pick<AppVersionConfig, 'latest' | 'minSupported' | 'forceUpdate'>>): Promise<AppVersionConfig>;
  setMaintenance(enabled: boolean, message: string): Promise<PlatformSettings>;
  resetDemoData(): Promise<{ ok: true }>;
}

const semver = /^\d+\.\d+\.\d+$/;
const cmpVer = (a: string, b: string) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};

const mockImpl: PlatformApi = {
  lookups: () =>
    mock(() => {
      currentAdmin();
      return {
        cities: db.cities.map(({ id, name, active }) => ({ id, name, active })),
        categories: db.categories.map(({ id, name, parentId, icon }) => ({ id, name, parentId, icon })),
        providers: db.providers.map((p) => ({ id: p.id, name: p.businessName, city: p.city, categoryIds: p.categoryIds, status: p.status })),
        partners: db.partners.map((p) => ({ id: p.id, name: p.name, city: p.city, status: p.status, online: p.online })),
        admins: db.admins.filter((a) => a.status === 'active').map((a) => ({ id: a.id, name: a.name, roleId: a.roleId })),
      };
    }, { latency: 120 }),

  admins: (f) =>
    mock(() => {
      requirePerm('admins.manage');
      const rows = db.admins.filter((a) => (!f.status || f.status === 'all' || a.status === f.status) && (!f.roleId || a.roleId === f.roleId));
      return paginate(rows, f, {
        search: (a) => `${a.name} ${a.email}`,
        sorters: { name: (a) => a.name, active: (a) => a.lastActiveAt ?? '', created: (a) => a.createdAt },
        defaultSort: 'created',
        defaultDir: 'asc',
      });
    }),
  saveAdmin: (input, id) =>
    mock(
      () => {
        const me = requirePerm('admins.manage');
        const email = input.email.trim().toLowerCase();
        assert(/^\S+@\S+\.\S+$/.test(email), 'Enter a valid email.');
        if (db.admins.some((a) => a.email === email && a.id !== id)) throw new ApiError('An admin with this email already exists.', 409, 'CONFLICT', { email: 'Already in use' });
        assert(db.roles.some((r) => r.id === input.roleId), 'Pick a valid role.');
        if (id) {
          const a = db.admins.find((x) => x.id === id) ?? notFound('Admin');
          if (a.id === me.id) assert(input.roleId === a.roleId, 'You can’t change your own role.');
          if (a.roleId === SUPER_ROLE_ID && input.roleId !== SUPER_ROLE_ID)
            assert(db.admins.filter((x) => x.roleId === SUPER_ROLE_ID && x.status === 'active').length > 1, 'At least one active Super Admin is required.');
          const from = db.roles.find((r) => r.id === a.roleId)?.name;
          Object.assign(a, { ...input, email, cityScope: input.roleId === SUPER_ROLE_ID ? [] : input.cityScope });
          const to = db.roles.find((r) => r.id === a.roleId)?.name;
          audit('admin.update', 'Admin', `Updated ${a.name}${from !== to ? ` (role ${from} → ${to})` : ''}`, a.id, from !== to ? 'critical' : 'info');
          return a;
        }
        const a: AdminUser = { ...input, email, id: uid('adm'), status: 'invited', twoFactor: input.roleId === SUPER_ROLE_ID, createdAt: new Date().toISOString() };
        db.admins.push(a);
        audit('admin.invite', 'Admin', `Invited ${a.name} as ${db.roles.find((r) => r.id === a.roleId)?.name}`, a.id, 'warning');
        return a;
      },
      { write: true },
    ),
  setAdminStatus: (id, status) =>
    mock(
      () => {
        const me = requirePerm('admins.manage');
        const a = db.admins.find((x) => x.id === id) ?? notFound('Admin');
        assert(a.id !== me.id, 'You can’t change your own status.');
        if (a.roleId === SUPER_ROLE_ID && status === 'suspended') assert(db.admins.filter((x) => x.roleId === SUPER_ROLE_ID && x.status === 'active').length > 1, 'At least one active Super Admin is required.');
        a.status = status;
        audit(`admin.${status === 'suspended' ? 'suspend' : 'activate'}`, 'Admin', `${status === 'suspended' ? 'Suspended' : 'Activated'} ${a.name}`, a.id, 'critical');
        return a;
      },
      { write: true },
    ),
  deleteAdmin: (id) =>
    mock(
      () => {
        const me = requirePerm('admins.manage');
        const a = db.admins.find((x) => x.id === id) ?? notFound('Admin');
        assert(a.id !== me.id, 'You can’t remove yourself.');
        assert(a.roleId !== SUPER_ROLE_ID || db.admins.filter((x) => x.roleId === SUPER_ROLE_ID).length > 1, 'At least one Super Admin is required.');
        db.admins = db.admins.filter((x) => x.id !== id);
        audit('admin.remove', 'Admin', `Removed ${a.name} (${a.email})`, id, 'critical');
        return { ok: true as const };
      },
      { write: true },
    ),
  resendInvite: (id) =>
    mock(() => {
      requirePerm('admins.manage');
      const a = db.admins.find((x) => x.id === id) ?? notFound('Admin');
      assert(a.status === 'invited', 'This admin has already joined.');
      audit('admin.reinvite', 'Admin', `Resent invite to ${a.email}`, a.id);
      return { ok: true as const };
    }, { write: true }),

  roles: () =>
    mock(() => {
      requirePerm('roles.manage', 'admins.manage');
      return db.roles.map((r) => ({ ...r, members: db.admins.filter((a) => a.roleId === r.id).length }));
    }),
  saveRole: (input, id) =>
    mock(
      () => {
        requirePerm('roles.manage');
        const name = input.name.trim();
        assert(name.length >= 3, 'Role name is too short.');
        if (db.roles.some((r) => r.name.toLowerCase() === name.toLowerCase() && r.id !== id)) throw new ApiError('A role with this name exists.', 409, 'CONFLICT', { name: 'Already exists' });
        assert(input.permissions.length > 0, 'Grant at least one permission.');
        const perms = input.permissions.filter((p) => !SUPER_ONLY.includes(p)) as Permission[];
        if (!perms.includes('dashboard.view')) perms.unshift('dashboard.view');
        if (id) {
          assert(id !== SUPER_ROLE_ID, 'The Super Admin role can’t be edited.');
          const r = db.roles.find((x) => x.id === id) ?? notFound('Role');
          const added = perms.filter((p) => !r.permissions.includes(p)).length;
          const removed = r.permissions.filter((p) => !perms.includes(p)).length;
          Object.assign(r, { ...input, name, permissions: perms });
          audit('role.update', 'Role', `Updated ${r.name} (+${added} / −${removed} permissions)`, r.id, 'critical');
          return r;
        }
        const r: AdminRole = { ...input, name, permissions: perms, id: uid('role'), system: false, createdAt: new Date().toISOString() };
        db.roles.push(r);
        audit('role.create', 'Role', `Created role ${r.name} with ${perms.length} permissions`, r.id, 'critical');
        return r;
      },
      { write: true },
    ),
  deleteRole: (id) =>
    mock(
      () => {
        requirePerm('roles.manage');
        const r = db.roles.find((x) => x.id === id) ?? notFound('Role');
        assert(!r.system, 'System roles can’t be deleted.');
        const members = db.admins.filter((a) => a.roleId === id).length;
        assert(!members, `Move the ${members} admin(s) with this role to another role first.`);
        db.roles = db.roles.filter((x) => x.id !== id);
        audit('role.delete', 'Role', `Deleted role ${r.name}`, id, 'critical');
        return { ok: true as const };
      },
      { write: true },
    ),

  settings: () => mock(() => (requirePerm('settings.manage'), db.settings)),
  updateSettings: (patch) =>
    mock(
      () => {
        requirePerm('settings.manage');
        const next = { ...db.settings, ...patch };
        const errors: Record<string, string> = {};
        if (next.taxPercent < 0 || next.taxPercent > 40) errors.taxPercent = 'Between 0 and 40%';
        if (next.defaultCommission < 0 || next.defaultCommission > 50) errors.defaultCommission = 'Between 0 and 50%';
        if (next.minPayout < 100) errors.minPayout = 'At least ₹100';
        if (!/^\S+@\S+\.\S+$/.test(next.supportEmail)) errors.supportEmail = 'Enter a valid email';
        if (!Object.values(next.paymentGateways).some(Boolean) && !next.cashOnService && !next.walletEnabled) errors.paymentGateways = 'Keep at least one payment method on';
        if (Object.keys(errors).length) throw new ApiError('Please fix the highlighted fields.', 422, 'VALIDATION', errors);
        const changed = (Object.keys(patch) as (keyof PlatformSettings)[]).filter((k) => JSON.stringify(db.settings[k]) !== JSON.stringify(patch[k]));
        Object.assign(db.settings, patch);
        if (changed.length) audit('settings.update', 'Settings', `Updated ${changed.join(', ')}`, undefined, 'critical');
        return db.settings;
      },
      { write: true },
    ),

  cities: () =>
    mock(() => {
      requirePerm('cities.manage');
      const since = Date.now() - 30 * 86_400_000;
      return db.cities.map((c) => ({
        ...c,
        providers: db.providers.filter((p) => p.city === c.name && p.status === 'approved').length,
        partners: db.partners.filter((p) => p.city === c.name && p.status === 'approved').length,
        customers: db.customers.filter((x) => x.city === c.name).length,
        bookings30: db.bookings.filter((b) => b.city === c.name && new Date(b.createdAt).getTime() >= since).length,
      }));
    }),
  saveCity: (input, id) =>
    mock(
      () => {
        requirePerm('cities.manage');
        const name = input.name.trim();
        assert(name.length >= 2 && input.state.trim().length >= 2, 'Enter the city and state.');
        assert(input.radiusKm >= 5 && input.radiusKm <= 100, 'Radius must be 5–100 km.');
        if (db.cities.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) throw new ApiError('City already exists.', 409, 'CONFLICT', { name: 'Already exists' });
        if (id) {
          const c = db.cities.find((x) => x.id === id) ?? notFound('City');
          const wasActive = c.active;
          Object.assign(c, { ...input, name, state: input.state.trim() });
          audit(wasActive !== c.active ? (c.active ? 'city.launch' : 'city.pause') : 'city.update', 'City', `${wasActive !== c.active ? (c.active ? 'Launched' : 'Paused') : 'Updated'} ${c.name}`, c.id, wasActive !== c.active ? 'critical' : 'info');
          return c;
        }
        const c: City = { ...input, name, state: input.state.trim(), id: uid('city'), launchedAt: new Date().toISOString() };
        db.cities.push(c);
        audit('city.create', 'City', `Added city ${c.name}`, c.id, 'warning');
        return c;
      },
      { write: true },
    ),

  audit: (f) =>
    mock(() => {
      requirePerm('audit.view');
      const since = f.days ? Date.now() - f.days * 86_400_000 : 0;
      const rows = db.auditLogs.filter((l) => (!f.severity || l.severity === f.severity) && (!f.actorId || l.actorId === f.actorId) && (!f.entity || l.entity === f.entity) && new Date(l.at).getTime() >= since);
      return paginate(rows, f, { search: (l) => `${l.summary} ${l.action} ${l.actorName} ${l.ip}`, sorters: { at: (l) => l.at, actor: (l) => l.actorName }, defaultSort: 'at', defaultDir: 'desc' });
    }),

  system: () =>
    mock(() => {
      requirePerm('system.manage');
      // Simulate live latency jitter
      db.systemServices.forEach((s) => {
        const next = Math.round(s.latencyMs * (0.85 + Math.random() * 0.3));
        s.history = [...s.history.slice(1), next];
      });
      return {
        services: db.systemServices,
        flags: db.featureFlags,
        versions: db.appVersions,
        maintenanceMode: db.settings.maintenanceMode,
        maintenanceMessage: db.settings.maintenanceMessage,
        dbSize: JSON.stringify(db).length,
        seededAt: db.seededAt,
      };
    }),
  saveFlag: (key, patch) =>
    mock(
      () => {
        requirePerm('system.manage');
        const f = db.featureFlags.find((x) => x.key === key) ?? notFound('Flag');
        if (patch.rollout !== undefined) assert(patch.rollout >= 0 && patch.rollout <= 100, 'Rollout must be 0–100%.');
        Object.assign(f, patch, { updatedAt: new Date().toISOString() });
        audit('flag.toggle', 'FeatureFlag', `${f.name}: ${f.enabled ? `on (${f.rollout}%)` : 'off'}`, f.key, 'critical');
        return f;
      },
      { write: true, latency: 250 },
    ),
  saveVersion: (app, platform, patch) =>
    mock(
      () => {
        requirePerm('system.manage');
        const v = db.appVersions.find((x) => x.app === app && x.platform === platform) ?? notFound('App');
        const next = { ...v, ...patch };
        assert(semver.test(next.latest) && semver.test(next.minSupported), 'Use versions like 3.8.2.');
        assert(cmpVer(next.minSupported, next.latest) <= 0, 'Minimum supported can’t be newer than the latest version.');
        Object.assign(v, patch);
        audit('app.version', 'AppVersion', `${app} ${platform}: latest ${v.latest}, min ${v.minSupported}${v.forceUpdate ? ' (force update)' : ''}`, `${app}-${platform}`, v.forceUpdate ? 'critical' : 'warning');
        return v;
      },
      { write: true },
    ),
  setMaintenance: (enabled, message) =>
    mock(
      () => {
        requirePerm('system.manage');
        assert(!enabled || message.trim().length >= 10, 'Write a short message for users (10+ characters).');
        db.settings.maintenanceMode = enabled;
        db.settings.maintenanceMessage = message.trim() || db.settings.maintenanceMessage;
        audit('system.maintenance', 'Settings', `Maintenance mode ${enabled ? 'ON' : 'OFF'}`, undefined, 'critical');
        return db.settings;
      },
      { write: true },
    ),
  resetDemoData: () =>
    mock(
      () => {
        requirePerm('system.manage');
        resetDb();
        return { ok: true as const };
      },
      { latency: 700 },
    ),
};

const httpImpl: PlatformApi = {
  lookups: () => http('/lookups'),
  admins: (f) => http('/admins', { query: { ...f } }),
  saveAdmin: (input, id) => http(id ? `/admins/${id}` : '/admins', { method: id ? 'PUT' : 'POST', body: input }),
  setAdminStatus: (id, status) => http(`/admins/${id}/status`, { method: 'PATCH', body: { status } }),
  deleteAdmin: (id) => http(`/admins/${id}`, { method: 'DELETE' }),
  resendInvite: (id) => http(`/admins/${id}/invite`, { method: 'POST' }),
  roles: () => http('/roles'),
  saveRole: (input, id) => http(id ? `/roles/${id}` : '/roles', { method: id ? 'PUT' : 'POST', body: input }),
  deleteRole: (id) => http(`/roles/${id}`, { method: 'DELETE' }),
  settings: () => http('/settings'),
  updateSettings: (patch) => http('/settings', { method: 'PATCH', body: patch }),
  cities: () => http('/cities'),
  saveCity: (input, id) => http(id ? `/cities/${id}` : '/cities', { method: id ? 'PUT' : 'POST', body: input }),
  audit: (f) => http('/audit-logs', { query: { ...f } }),
  system: () => http('/system'),
  saveFlag: (key, patch) => http(`/system/flags/${key}`, { method: 'PATCH', body: patch }),
  saveVersion: (app, platform, patch) => http(`/system/app-versions/${app}/${platform}`, { method: 'PATCH', body: patch }),
  setMaintenance: (enabled, message) => http('/system/maintenance', { method: 'PUT', body: { enabled, message } }),
  resetDemoData: () => Promise.resolve({ ok: true as const }),
};

export const platformApi: PlatformApi = env.useMocks ? mockImpl : httpImpl;
