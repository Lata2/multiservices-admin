import type { AppRole, ID, ISODate, PaymentMethod } from './models';

/* ───────────── Access control ───────────── */

export const PERMISSIONS = [
  'dashboard.view',
  'bookings.view',
  'bookings.manage',
  'customers.view',
  'customers.manage',
  'providers.view',
  'providers.manage',
  'partners.view',
  'partners.manage',
  'deliveries.view',
  'deliveries.manage',
  'catalog.view',
  'catalog.manage',
  'payments.view',
  'payments.refund',
  'payouts.view',
  'payouts.manage',
  'marketing.manage',
  'reviews.moderate',
  'support.view',
  'support.manage',
  'content.manage',
  'reports.view',
  'analytics.view',
  'admins.manage',
  'roles.manage',
  'settings.manage',
  'cities.manage',
  'audit.view',
  'system.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type Panel = 'admin' | 'super';

export interface AdminRole {
  id: ID;
  name: string;
  description: string;
  permissions: Permission[];
  /** System roles can't be deleted; the Super Admin role can't be edited. */
  system: boolean;
  color: 'primary' | 'accent' | 'success' | 'info' | 'highlight' | 'danger' | 'warning';
  createdAt: ISODate;
}

export type AdminStatus = 'active' | 'invited' | 'suspended';

export interface AdminUser {
  id: ID;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  roleId: ID;
  status: AdminStatus;
  /** City names this admin can see. Empty = all cities. */
  cityScope: string[];
  twoFactor: boolean;
  lastActiveAt?: ISODate;
  createdAt: ISODate;
}

/** The signed-in admin with resolved role + permissions (what the session carries). */
export interface SessionAdmin extends AdminUser {
  role: AdminRole;
  panel: Panel;
}

/* ───────────── Audit ───────────── */

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLog {
  id: ID;
  actorId: ID;
  actorName: string;
  actorRole: string;
  action: string; // e.g. "booking.cancel"
  entity: string; // e.g. "Booking"
  entityId?: ID;
  summary: string;
  severity: AuditSeverity;
  ip: string;
  at: ISODate;
}

/* ───────────── Platform configuration ───────────── */

export interface PlatformSettings {
  platformName: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  supportEmail: string;
  supportPhone: string;
  taxPercent: number;
  defaultCommission: number;
  deliveryCommission: number;
  maxVisitingCharge: number;
  minPayout: number;
  payoutCycle: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  autoApprovePayoutsBelow: number;
  cancellationWindowHours: number;
  lateCancellationFee: number;
  maxReschedules: number;
  advanceBookingDays: number;
  referrerBonus: number;
  refereeBonus: number;
  paymentGateways: Record<Exclude<PaymentMethod, 'wallet' | 'cash'>, boolean>;
  cashOnService: boolean;
  walletEnabled: boolean;
  channels: { push: boolean; sms: boolean; email: boolean; whatsapp: boolean };
  maintenanceMode: boolean;
  maintenanceMessage: string;
  providerAutoApproval: boolean;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number; // percent 0–100
  audience: AppRole | 'all';
  updatedAt: ISODate;
}

export interface AppVersionConfig {
  app: AppRole;
  platform: 'android' | 'ios';
  latest: string;
  minSupported: string;
  forceUpdate: boolean;
  activeInstalls: number;
}

export type ServiceHealth = 'operational' | 'degraded' | 'down';

export interface SystemService {
  key: string;
  name: string;
  status: ServiceHealth;
  latencyMs: number;
  uptime: number; // percent, 30 days
  history: number[]; // latency samples
}

/* ───────────── Messaging ───────────── */

export type Audience = 'all' | AppRole;
export type Channel = 'push' | 'sms' | 'email';

export interface Broadcast {
  id: ID;
  title: string;
  body: string;
  audience: Audience;
  city: string | null;
  channels: Channel[];
  status: 'sent' | 'scheduled' | 'draft';
  scheduledFor?: ISODate;
  recipients: number;
  openRate?: number;
  createdBy: string;
  createdAt: ISODate;
}

export type NotificationKind = 'approval' | 'payout' | 'ticket' | 'booking' | 'system' | 'review';

export interface AdminNotification {
  id: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  /** Only shown to admins holding this permission. */
  permission?: Permission;
  createdAt: ISODate;
}

/* ───────────── Listing contract ───────────── */

export type SortDir = 'asc' | 'desc';

export interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  dir?: SortDir;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export type DateRange = '7d' | '30d' | '90d' | '12m';
