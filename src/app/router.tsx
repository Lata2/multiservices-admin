import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth, RequirePanel, RequirePermission } from '@/components/layout/Guards';
import { panelBase } from '@/hooks/useAccess';
import { useAuthStore } from '@/store/auth.store';
import type { Panel, Permission } from '@/types/admin';
import { RouteError } from './RouteError';

/** Lazy route with one automatic retry (handles stale chunks after a deploy). */
function page(loader: () => Promise<{ default: ComponentType }>): LazyExoticComponent<ComponentType> {
  return lazy(() =>
    loader()
      .then((m) => {
        sessionStorage.removeItem('chunk-reload');
        return m;
      })
      .catch(() => {
      const key = 'chunk-reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      return loader();
    }),
  );
}

const P = {
  AdminDashboard: page(() => import('@/features/dashboard/AdminDashboard')),
  SuperDashboard: page(() => import('@/features/super/SuperDashboard')),
  Analytics: page(() => import('@/features/super/AnalyticsPage')),
  Bookings: page(() => import('@/features/bookings/BookingsPage')),
  BookingDetail: page(() => import('@/features/bookings/BookingDetailPage')),
  Dispatch: page(() => import('@/features/deliveries/DispatchPage')),
  Support: page(() => import('@/features/support/SupportPage')),
  Customers: page(() => import('@/features/customers/CustomersPage')),
  CustomerDetail: page(() => import('@/features/customers/CustomerDetailPage')),
  Providers: page(() => import('@/features/providers/ProvidersPage')),
  ProviderDetail: page(() => import('@/features/providers/ProviderDetailPage')),
  Partners: page(() => import('@/features/partners/PartnersPage')),
  Categories: page(() => import('@/features/catalog/CategoriesPage')),
  Services: page(() => import('@/features/catalog/ServicesPage')),
  Payments: page(() => import('@/features/finance/PaymentsPage')),
  Payouts: page(() => import('@/features/finance/PayoutsPage')),
  Reports: page(() => import('@/features/reports/ReportsPage')),
  Promos: page(() => import('@/features/marketing/PromosPage')),
  Banners: page(() => import('@/features/marketing/BannersPage')),
  Broadcasts: page(() => import('@/features/marketing/BroadcastsPage')),
  Reviews: page(() => import('@/features/reviews/ReviewsPage')),
  Content: page(() => import('@/features/content/ContentPage')),
  Notifications: page(() => import('@/features/account/NotificationsPage')),
  Profile: page(() => import('@/features/account/ProfilePage')),
  Admins: page(() => import('@/features/super/AdminsPage')),
  Roles: page(() => import('@/features/super/RolesPage')),
  Cities: page(() => import('@/features/super/CitiesPage')),
  Settings: page(() => import('@/features/super/SettingsPage')),
  System: page(() => import('@/features/super/SystemPage')),
  Audit: page(() => import('@/features/super/AuditPage')),
  Login: page(() => import('@/features/auth/LoginPage')),
  NotFound: page(() => import('@/features/auth/NotFoundPage')),
};

interface Def {
  path: string;
  Component: LazyExoticComponent<ComponentType>;
  permission?: Permission | Permission[];
  panels?: Panel[];
}

/** One route table for both panels; `panels` restricts Super-only modules. */
const DEFS: Def[] = [
  { path: 'bookings', Component: P.Bookings, permission: 'bookings.view' },
  { path: 'bookings/:id', Component: P.BookingDetail, permission: ['bookings.view', 'payments.view'] },
  { path: 'dispatch', Component: P.Dispatch, permission: 'deliveries.view' },
  { path: 'support', Component: P.Support, permission: 'support.view' },
  { path: 'support/:id', Component: P.Support, permission: 'support.view' },
  { path: 'customers', Component: P.Customers, permission: 'customers.view' },
  { path: 'customers/:id', Component: P.CustomerDetail, permission: 'customers.view' },
  { path: 'providers', Component: P.Providers, permission: 'providers.view' },
  { path: 'providers/:id', Component: P.ProviderDetail, permission: 'providers.view' },
  { path: 'partners', Component: P.Partners, permission: 'partners.view' },
  { path: 'categories', Component: P.Categories, permission: 'catalog.view' },
  { path: 'services', Component: P.Services, permission: 'catalog.view' },
  { path: 'payments', Component: P.Payments, permission: 'payments.view' },
  { path: 'payouts', Component: P.Payouts, permission: 'payouts.view' },
  { path: 'reports', Component: P.Reports, permission: 'reports.view' },
  { path: 'promos', Component: P.Promos, permission: 'marketing.manage' },
  { path: 'banners', Component: P.Banners, permission: 'marketing.manage' },
  { path: 'broadcasts', Component: P.Broadcasts, permission: 'marketing.manage' },
  { path: 'reviews', Component: P.Reviews, permission: 'reviews.moderate' },
  { path: 'content', Component: P.Content, permission: 'content.manage' },
  { path: 'notifications', Component: P.Notifications },
  { path: 'profile', Component: P.Profile },
  { path: 'analytics', Component: P.Analytics, permission: 'analytics.view', panels: ['super'] },
  { path: 'admins', Component: P.Admins, permission: 'admins.manage', panels: ['super'] },
  { path: 'roles', Component: P.Roles, permission: 'roles.manage', panels: ['super'] },
  { path: 'cities', Component: P.Cities, permission: 'cities.manage', panels: ['super'] },
  { path: 'settings', Component: P.Settings, permission: 'settings.manage', panels: ['super'] },
  { path: 'system', Component: P.System, permission: 'system.manage', panels: ['super'] },
  { path: 'audit', Component: P.Audit, permission: 'audit.view', panels: ['super'] },
];

function panelRoutes(panel: Panel): RouteObject {
  const Home = panel === 'super' ? P.SuperDashboard : P.AdminDashboard;
  return {
    path: panelBase(panel),
    element: (
      <RequireAuth>
        <RequirePanel panel={panel}>
          <AppShell />
        </RequirePanel>
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <RequirePermission permission="dashboard.view">
            <Home />
          </RequirePermission>
        ),
      },
      ...DEFS.filter((d) => !d.panels || d.panels.includes(panel)).map(({ path, Component, permission }) => ({
        path,
        element: (
          <RequirePermission permission={permission}>
            <Component />
          </RequirePermission>
        ),
      })),
      { path: '*', element: <P.NotFound /> },
    ],
  };
}

function HomeRedirect() {
  const admin = useAuthStore((s) => s.admin);
  return <Navigate to={admin ? panelBase(admin.panel) : '/login'} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <HomeRedirect />, errorElement: <RouteError /> },
  { path: '/login', element: <P.Login />, errorElement: <RouteError /> },
  panelRoutes('admin'),
  panelRoutes('super'),
  { path: '*', element: <P.NotFound />, errorElement: <RouteError /> },
]);
