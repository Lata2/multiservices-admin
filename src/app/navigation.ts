import {
  BadgePercent,
  Bell,
  Bike,
  BookOpenText,
  CalendarCheck2,
  ChartColumnBig,
  ChartPie,
  CreditCard,
  FileClock,
  Gauge,
  Image,
  LayoutGrid,
  LifeBuoy,
  Map,
  Megaphone,
  PackageCheck,
  ServerCog,
  Settings2,
  ShieldCheck,
  Star,
  Store,
  UserCog,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Panel, Permission } from '@/types/admin';

export type BadgeKey = 'pendingProviders' | 'pendingPartners' | 'pendingPayouts' | 'openTickets' | 'flaggedReviews' | 'unassignedTasks';

export interface NavItem {
  path: string; // panel-relative
  label: string;
  icon: LucideIcon;
  permission?: Permission | Permission[];
  panels?: Panel[]; // default: both
  badge?: BadgeKey;
  keywords?: string;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [
      { path: '/', label: 'Dashboard', icon: Gauge, permission: 'dashboard.view', keywords: 'home overview kpi' },
      { path: '/analytics', label: 'Analytics', icon: ChartPie, permission: 'analytics.view', panels: ['super'], keywords: 'cohort funnel retention' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { path: '/bookings', label: 'Bookings', icon: CalendarCheck2, permission: 'bookings.view', keywords: 'orders jobs' },
      { path: '/dispatch', label: 'Dispatch', icon: PackageCheck, permission: 'deliveries.view', badge: 'unassignedTasks', keywords: 'delivery pickup drop tasks' },
      { path: '/support', label: 'Support desk', icon: LifeBuoy, permission: 'support.view', badge: 'openTickets', keywords: 'tickets help' },
    ],
  },
  {
    title: 'People',
    items: [
      { path: '/customers', label: 'Customers', icon: Users, permission: 'customers.view', keywords: 'users' },
      { path: '/providers', label: 'Providers', icon: Store, permission: 'providers.view', badge: 'pendingProviders', keywords: 'professionals vendors kyc' },
      { path: '/partners', label: 'Delivery partners', icon: Bike, permission: 'partners.view', badge: 'pendingPartners', keywords: 'riders' },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { path: '/categories', label: 'Categories', icon: LayoutGrid, permission: 'catalog.view' },
      { path: '/services', label: 'Services', icon: Wrench, permission: 'catalog.view' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { path: '/payments', label: 'Payments', icon: CreditCard, permission: 'payments.view', keywords: 'transactions refunds ledger' },
      { path: '/payouts', label: 'Payouts', icon: Wallet, permission: 'payouts.view', badge: 'pendingPayouts', keywords: 'withdrawals settlements' },
      { path: '/reports', label: 'Reports', icon: ChartColumnBig, permission: 'reports.view', keywords: 'export csv revenue' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { path: '/promos', label: 'Promo codes', icon: BadgePercent, permission: 'marketing.manage', keywords: 'coupons offers discounts' },
      { path: '/banners', label: 'Banners', icon: Image, permission: 'marketing.manage' },
      { path: '/broadcasts', label: 'Broadcasts', icon: Megaphone, permission: 'marketing.manage', keywords: 'push sms email notifications' },
      { path: '/reviews', label: 'Reviews', icon: Star, permission: 'reviews.moderate', badge: 'flaggedReviews', keywords: 'ratings moderation' },
      { path: '/content', label: 'Content & FAQs', icon: BookOpenText, permission: 'content.manage', keywords: 'legal terms privacy' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { path: '/admins', label: 'Admin team', icon: UserCog, permission: 'admins.manage', panels: ['super'], keywords: 'staff invite' },
      { path: '/roles', label: 'Roles & permissions', icon: ShieldCheck, permission: 'roles.manage', panels: ['super'], keywords: 'rbac access' },
      { path: '/cities', label: 'Cities & zones', icon: Map, permission: 'cities.manage', panels: ['super'] },
      { path: '/settings', label: 'Global settings', icon: Settings2, permission: 'settings.manage', panels: ['super'], keywords: 'tax commission fees payment gateways' },
      { path: '/system', label: 'System', icon: ServerCog, permission: 'system.manage', panels: ['super'], keywords: 'feature flags app versions maintenance health' },
      { path: '/audit', label: 'Audit log', icon: FileClock, permission: 'audit.view', panels: ['super'], keywords: 'activity history' },
    ],
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/profile', label: 'Profile & security', icon: UserCog, keywords: 'password 2fa account' },
];
