/**
 * TanStack Query hooks — the only way screens read server data.
 * Lists keep the previous page while the next one loads (no flicker).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  bookingsApi,
  catalogApi,
  customersApi,
  deliveryApi,
  engagementApi,
  financeApi,
  insightsApi,
  marketingApi,
  platformApi,
  providersApi,
} from '@/services/api';
import type { BookingFilters } from '@/services/api/bookings.api';
import type { ServiceFilters } from '@/services/api/catalog.api';
import type { CustomerFilters } from '@/services/api/customers.api';
import type { PartnerFilters, TaskFilters } from '@/services/api/delivery.api';
import type { ReviewFilters, TicketFilters } from '@/services/api/engagement.api';
import type { PayoutFilters, TransactionFilters } from '@/services/api/finance.api';
import type { AuditFilters } from '@/services/api/platform.api';
import type { ProviderFilters } from '@/services/api/providers.api';
import type { AdminStatus, DateRange, ListParams } from '@/types/admin';
import { qk } from '../queryKeys';

const list = { placeholderData: keepPreviousData } as const;

/* Shared */
export const useLookups = () => useQuery({ queryKey: qk.lookups, queryFn: platformApi.lookups, staleTime: 5 * 60_000 });
export const useNotifications = () => useQuery({ queryKey: qk.notifications, queryFn: insightsApi.notifications, refetchInterval: 60_000 });

/* Dashboards & insights */
export const useAdminDashboard = () => useQuery({ queryKey: qk.dashboard.admin, queryFn: insightsApi.adminDashboard, refetchInterval: 60_000 });
export const useSuperDashboard = () => useQuery({ queryKey: qk.dashboard.super, queryFn: insightsApi.superDashboard });
export const useReport = (range: DateRange, city?: string) => useQuery({ queryKey: qk.reports.report(range, city), queryFn: () => insightsApi.report(range, city), ...list });
export const useAnalytics = (range: DateRange) => useQuery({ queryKey: qk.reports.analytics(range), queryFn: () => insightsApi.analytics(range), ...list });

/* Bookings */
export const useBookings = (f: BookingFilters) => useQuery({ queryKey: qk.bookings.list(f), queryFn: () => bookingsApi.list(f), ...list });
export const useBooking = (id: string) => useQuery({ queryKey: qk.bookings.detail(id), queryFn: () => bookingsApi.get(id), enabled: !!id });

/* People */
export const useCustomers = (f: CustomerFilters) => useQuery({ queryKey: qk.customers.list(f), queryFn: () => customersApi.list(f), ...list });
export const useCustomer = (id: string) => useQuery({ queryKey: qk.customers.detail(id), queryFn: () => customersApi.get(id), enabled: !!id });
export const useProviders = (f: ProviderFilters) => useQuery({ queryKey: qk.providers.list(f), queryFn: () => providersApi.list(f), ...list });
export const useProvider = (id: string) => useQuery({ queryKey: qk.providers.detail(id), queryFn: () => providersApi.get(id), enabled: !!id });
export const usePartners = (f: PartnerFilters) => useQuery({ queryKey: qk.partners.list(f), queryFn: () => deliveryApi.partners(f), ...list });
export const usePartner = (id: string) => useQuery({ queryKey: qk.partners.detail(id), queryFn: () => deliveryApi.partner(id), enabled: !!id });
export const useTasks = (f: TaskFilters) => useQuery({ queryKey: qk.tasks.list(f), queryFn: () => deliveryApi.tasks(f), ...list });

/* Catalogue */
export const useCategoryTree = () => useQuery({ queryKey: qk.catalog.tree, queryFn: catalogApi.categoryTree });
export const useCategories = () => useQuery({ queryKey: qk.catalog.categories, queryFn: catalogApi.categories, staleTime: 5 * 60_000 });
export const useServices = (f: ServiceFilters) => useQuery({ queryKey: qk.catalog.services(f), queryFn: () => catalogApi.services(f), ...list });

/* Finance */
export const useFinanceSummary = (days: number) => useQuery({ queryKey: qk.finance.summary(days), queryFn: () => financeApi.summary(days), ...list });
export const useTransactions = (f: TransactionFilters) => useQuery({ queryKey: qk.finance.tx(f), queryFn: () => financeApi.transactions(f), ...list });
export const usePayouts = (f: PayoutFilters) => useQuery({ queryKey: qk.finance.payouts(f), queryFn: () => financeApi.payouts(f), ...list });

/* Marketing & engagement */
export const usePromos = () => useQuery({ queryKey: qk.marketing.promos, queryFn: marketingApi.promos });
export const useBanners = () => useQuery({ queryKey: qk.marketing.banners, queryFn: marketingApi.banners });
export const useBroadcasts = () => useQuery({ queryKey: qk.marketing.broadcasts, queryFn: marketingApi.broadcasts });
export const useAudienceSize = (audience: string, city: string | null) =>
  useQuery({ queryKey: qk.marketing.audience(audience, city), queryFn: () => marketingApi.audienceSize(audience as never, city), ...list });
export const useReviews = (f: ReviewFilters) => useQuery({ queryKey: qk.reviews.list(f), queryFn: () => engagementApi.reviews(f), ...list });
export const useTickets = (f: TicketFilters) => useQuery({ queryKey: qk.tickets.list(f), queryFn: () => engagementApi.tickets(f), ...list });
export const useTicket = (id: string) => useQuery({ queryKey: qk.tickets.detail(id), queryFn: () => engagementApi.ticket(id), enabled: !!id });
export const useFaqs = () => useQuery({ queryKey: qk.content.faqs, queryFn: engagementApi.faqs });
export const usePages = () => useQuery({ queryKey: qk.content.pages, queryFn: engagementApi.pages });

/* Platform (Super Admin) */
export const useAdmins = (f: Partial<ListParams> & { status?: AdminStatus | 'all'; roleId?: string }) => useQuery({ queryKey: qk.platform.admins(f), queryFn: () => platformApi.admins(f), ...list });
export const useRoles = () => useQuery({ queryKey: qk.platform.roles, queryFn: platformApi.roles });
export const useSettings = () => useQuery({ queryKey: qk.platform.settings, queryFn: platformApi.settings });
export const useCities = () => useQuery({ queryKey: qk.platform.cities, queryFn: platformApi.cities });
export const useAuditLogs = (f: AuditFilters) => useQuery({ queryKey: qk.platform.audit(f), queryFn: () => platformApi.audit(f), ...list });
export const useSystem = () => useQuery({ queryKey: qk.platform.system, queryFn: platformApi.system, refetchInterval: 15_000 });
