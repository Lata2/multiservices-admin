import { PERMISSIONS, type AdminRole, type Panel, type Permission } from '@/types/admin';

/**
 * Permission catalogue. Drives the role editor matrix, navigation filtering and
 * route guards. In production the backend must enforce the same rules — the
 * frontend checks only hide what a user can't use.
 */
export interface PermissionGroup {
  key: string;
  label: string;
  permissions: { key: Permission; label: string; description: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'operations',
    label: 'Operations',
    permissions: [
      { key: 'dashboard.view', label: 'View dashboard', description: 'KPIs and live operations' },
      { key: 'bookings.view', label: 'View bookings', description: 'Booking list and details' },
      { key: 'bookings.manage', label: 'Manage bookings', description: 'Change status, reassign, cancel' },
      { key: 'deliveries.view', label: 'View deliveries', description: 'Pickup & drop tasks' },
      { key: 'deliveries.manage', label: 'Dispatch deliveries', description: 'Assign partners, cancel tasks' },
    ],
  },
  {
    key: 'people',
    label: 'People',
    permissions: [
      { key: 'customers.view', label: 'View customers', description: 'Customer profiles and history' },
      { key: 'customers.manage', label: 'Manage customers', description: 'Block, wallet adjustments' },
      { key: 'providers.view', label: 'View providers', description: 'Provider profiles and KYC' },
      { key: 'providers.manage', label: 'Manage providers', description: 'Approve, suspend, commission, KYC' },
      { key: 'partners.view', label: 'View delivery partners', description: 'Partner profiles' },
      { key: 'partners.manage', label: 'Manage delivery partners', description: 'Approve and suspend' },
    ],
  },
  {
    key: 'catalog',
    label: 'Catalogue & growth',
    permissions: [
      { key: 'catalog.view', label: 'View catalogue', description: 'Categories and services' },
      { key: 'catalog.manage', label: 'Manage catalogue', description: 'Edit categories and services' },
      { key: 'marketing.manage', label: 'Marketing', description: 'Promo codes, banners, broadcasts' },
      { key: 'reviews.moderate', label: 'Moderate reviews', description: 'Hide, restore and remove reviews' },
      { key: 'content.manage', label: 'Content', description: 'FAQs and legal pages' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    permissions: [
      { key: 'payments.view', label: 'View payments', description: 'Transactions ledger' },
      { key: 'payments.refund', label: 'Issue refunds', description: 'Full and partial refunds' },
      { key: 'payouts.view', label: 'View payouts', description: 'Provider & partner payouts' },
      { key: 'payouts.manage', label: 'Process payouts', description: 'Approve, pay and reject' },
      { key: 'reports.view', label: 'Reports', description: 'Reports and exports' },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    permissions: [
      { key: 'support.view', label: 'View tickets', description: 'Support desk' },
      { key: 'support.manage', label: 'Handle tickets', description: 'Reply, assign, resolve' },
    ],
  },
  {
    key: 'platform',
    label: 'Platform (Super Admin only)',
    permissions: [
      { key: 'analytics.view', label: 'Platform analytics', description: 'Cohorts, funnels, city comparison' },
      { key: 'admins.manage', label: 'Manage admins', description: 'Invite, suspend, assign roles' },
      { key: 'roles.manage', label: 'Roles & permissions', description: 'Create and edit roles' },
      { key: 'settings.manage', label: 'Global settings', description: 'Fees, tax, payments, policies' },
      { key: 'cities.manage', label: 'Cities & zones', description: 'Launch and pause cities' },
      { key: 'audit.view', label: 'Audit logs', description: 'Every admin action' },
      { key: 'system.manage', label: 'System controls', description: 'Flags, app versions, maintenance' },
    ],
  },
];

/** Permissions that only the Super Admin role can hold. */
export const SUPER_ONLY: Permission[] = ['analytics.view', 'admins.manage', 'roles.manage', 'settings.manage', 'cities.manage', 'audit.view', 'system.manage'];

export const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];
export const ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter((p) => !SUPER_ONLY.includes(p));

export const SUPER_ROLE_ID = 'role_super';

export const panelForRole = (role: Pick<AdminRole, 'id'>): Panel => (role.id === SUPER_ROLE_ID ? 'super' : 'admin');

export const permissionLabel = (p: Permission) =>
  PERMISSION_GROUPS.flatMap((g) => g.permissions).find((x) => x.key === p)?.label ?? p;

export function can(perms: readonly Permission[] | undefined, required?: Permission | Permission[]) {
  if (!required) return true;
  if (!perms) return false;
  const list = Array.isArray(required) ? required : [required];
  return list.some((r) => perms.includes(r));
}
