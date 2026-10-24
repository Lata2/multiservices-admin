import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { todayKey } from '@/lib/format';
import type { AdminNotification, AuditLog, DateRange, ServiceHealth } from '@/types/admin';
import type { Booking, BookingStatus } from '@/types/models';
import { http } from '../http';
import { currentAdmin, inScope, mock, requirePerm, scopeCities } from '../mock/server';

const DAY = 86_400_000;
const RANGE_DAYS: Record<DateRange, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };

export interface SeriesPoint {
  label: string;
  gmv: number;
  revenue: number;
  bookings: number;
}

export interface AdminDashboard {
  kpis: {
    todayBookings: number;
    todayGmv: number;
    activeJobs: number;
    gmv30: number;
    gmvGrowth: number;
    revenue30: number;
    revenueGrowth: number;
    bookings30: number;
    bookingsGrowth: number;
    newCustomers30: number;
    avgRating: number;
    cancellationRate: number;
  };
  attention: { pendingProviders: number; pendingPartners: number; pendingPayouts: number; openTickets: number; flaggedReviews: number; unassignedTasks: number };
  trend: SeriesPoint[];
  statusMix: { status: BookingStatus; count: number }[];
  liveJobs: Booking[];
  topCategories: { id: string; name: string; bookings: number; gmv: number }[];
  topProviders: { id: string; name: string; city: string; bookings: number; gmv: number; rating: number }[];
  recentBookings: Booking[];
  onlinePartners: number;
}

export interface SuperDashboard {
  kpis: { gmv: number; revenue: number; bookings: number; customers: number; providers: number; partners: number; admins: number; cities: number; gmvGrowth: number; revenueGrowth: number };
  monthly: SeriesPoint[];
  cities: { name: string; active: boolean; gmv: number; bookings: number; providers: number; customers: number; growth: number }[];
  categoryRevenue: { name: string; value: number }[];
  health: { key: string; name: string; status: ServiceHealth; latencyMs: number }[];
  recentAudit: AuditLog[];
  adminActivity: { id: string; name: string; avatar?: string; role: string; lastActiveAt?: string; actions7d: number }[];
  approvals: { providers: number; partners: number; payouts: number; invites: number };
}

export interface Report {
  range: DateRange;
  summary: { gmv: number; revenue: number; bookings: number; completed: number; cancelled: number; aov: number; newCustomers: number; repeatRate: number; refunds: number };
  previous: { gmv: number; revenue: number; bookings: number; aov: number };
  series: SeriesPoint[];
  byCategory: { id: string; name: string; bookings: number; gmv: number; revenue: number }[];
  byCity: { name: string; bookings: number; gmv: number; revenue: number; completion: number }[];
  paymentMix: { method: string; count: number; amount: number }[];
  topProviders: { id: string; name: string; city: string; bookings: number; gmv: number; rating: number }[];
  topServices: { id: string; title: string; provider: string; bookings: number; gmv: number }[];
  peakHours: { hour: string; bookings: number }[];
}

export interface Analytics {
  funnel: { stage: string; value: number }[];
  cohorts: { cohort: string; size: number; retention: (number | null)[] }[];
  heatmap: { day: string; hours: number[] }[];
  supplyDemand: { name: string; providers: number; bookings: number; perProvider: number }[];
  customerGrowth: { label: string; total: number; new: number }[];
  cityComparison: { name: string; gmv: number; bookings: number; completion: number; rating: number; aov: number; cancelRate: number }[];
  ratingTrend: { label: string; rating: number }[];
}

const catName = (id: string) => db.categories.find((c) => c.id === id)?.name ?? id;
const ts = (b: Booking) => new Date(b.createdAt).getTime();
const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
const growth = (cur: number, prev: number) => (prev ? (cur - prev) / prev : cur ? 1 : 0);
const completed = (rows: Booking[]) => rows.filter((b) => b.status === 'completed');

function scoped(city?: string) {
  const scope = scopeCities();
  return db.bookings.filter((b) => inScope(b.city, scope) && (!city || b.city === city));
}

function buckets(range: DateRange) {
  const now = Date.now();
  if (range === '12m') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      d.setMonth(d.getMonth() - (11 - i));
      const end = new Date(d);
      end.setMonth(end.getMonth() + 1);
      return { label: d.toLocaleDateString('en-IN', { month: 'short' }), start: d.getTime(), end: end.getTime() };
    });
  }
  const days = RANGE_DAYS[range];
  const size = range === '90d' ? 7 : 1;
  const count = Math.ceil(days / size);
  return Array.from({ length: count }, (_, i) => {
    const end = now - (count - 1 - i) * size * DAY;
    const start = end - size * DAY;
    return { label: new Date(end).toLocaleDateString('en-IN', range === '7d' ? { weekday: 'short' } : { day: 'numeric', month: 'short' }), start, end };
  });
}

function series(rows: Booking[], range: DateRange): SeriesPoint[] {
  return buckets(range).map(({ label, start, end }) => {
    const inB = rows.filter((b) => ts(b) >= start && ts(b) < end);
    const done = completed(inB);
    return { label, gmv: sum(done, (b) => b.pricing.total), revenue: sum(done, (b) => b.pricing.commission), bookings: inB.length };
  });
}

function providerRank(rows: Booking[]) {
  const map = new Map<string, { bookings: number; gmv: number }>();
  rows.forEach((b) => {
    const m = map.get(b.providerId) ?? { bookings: 0, gmv: 0 };
    m.bookings += 1;
    if (b.status === 'completed') m.gmv += b.pricing.total;
    map.set(b.providerId, m);
  });
  return [...map.entries()]
    .map(([id, m]) => {
      const p = db.providers.find((x) => x.id === id)!;
      return { id, name: p.businessName, city: p.city, rating: p.rating, ...m };
    })
    .sort((a, b) => b.gmv - a.gmv);
}

function categoryRank(rows: Booking[]) {
  const map = new Map<string, { bookings: number; gmv: number; revenue: number }>();
  rows.forEach((b) => {
    const m = map.get(b.categoryId) ?? { bookings: 0, gmv: 0, revenue: 0 };
    m.bookings += 1;
    if (b.status === 'completed') {
      m.gmv += b.pricing.total;
      m.revenue += b.pricing.commission;
    }
    map.set(b.categoryId, m);
  });
  return [...map.entries()].map(([id, m]) => ({ id, name: catName(id), ...m })).sort((a, b) => b.gmv - a.gmv);
}

const mockImpl = {
  adminDashboard: () =>
    mock<AdminDashboard>(() => {
      const me = requirePerm('dashboard.view');
      const scope = scopeCities();
      const all = scoped();
      const now = Date.now();
      const last30 = all.filter((b) => ts(b) >= now - 30 * DAY);
      const prev30 = all.filter((b) => ts(b) >= now - 60 * DAY && ts(b) < now - 30 * DAY);
      const today = todayKey();
      const todayRows = all.filter((b) => b.scheduledDate === today);
      const pub = db.reviews.filter((r) => r.status === 'published');
      const has = (p: string) => me.role.permissions.includes(p as never);
      const status: BookingStatus[] = ['pending', 'confirmed', 'on_the_way', 'in_progress', 'completed', 'cancelled', 'rejected'];
      return {
        kpis: {
          todayBookings: todayRows.length,
          todayGmv: sum(todayRows.filter((b) => b.status !== 'cancelled' && b.status !== 'rejected'), (b) => b.pricing.total),
          activeJobs: all.filter((b) => b.status === 'on_the_way' || b.status === 'in_progress').length,
          gmv30: sum(completed(last30), (b) => b.pricing.total),
          gmvGrowth: growth(sum(completed(last30), (b) => b.pricing.total), sum(completed(prev30), (b) => b.pricing.total)),
          revenue30: sum(completed(last30), (b) => b.pricing.commission),
          revenueGrowth: growth(sum(completed(last30), (b) => b.pricing.commission), sum(completed(prev30), (b) => b.pricing.commission)),
          bookings30: last30.length,
          bookingsGrowth: growth(last30.length, prev30.length),
          newCustomers30: (() => {
            const first = new Map<string, number>();
            all.forEach((b) => first.set(b.customerId, Math.min(first.get(b.customerId) ?? Infinity, ts(b))));
            return [...first.values()].filter((t) => t >= now - 30 * DAY).length;
          })(),
          avgRating: pub.length ? sum(pub, (r) => r.rating) / pub.length : 0,
          cancellationRate: last30.length ? last30.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length / last30.length : 0,
        },
        attention: {
          pendingProviders: has('providers.manage') ? db.providers.filter((p) => p.status === 'pending' && inScope(p.city, scope)).length : 0,
          pendingPartners: has('partners.manage') ? db.partners.filter((p) => p.status === 'pending' && inScope(p.city, scope)).length : 0,
          pendingPayouts: has('payouts.manage') ? db.payouts.filter((p) => p.status === 'requested' || p.status === 'approved').length : 0,
          openTickets: has('support.view') ? db.tickets.filter((t) => t.status === 'open').length : 0,
          flaggedReviews: has('reviews.moderate') ? db.reviews.filter((r) => r.status === 'flagged').length : 0,
          unassignedTasks: has('deliveries.manage') ? db.deliveryTasks.filter((t) => t.status === 'available' && inScope(t.city, scope)).length : 0,
        },
        trend: series(all, '30d'),
        statusMix: status.map((s) => ({ status: s, count: last30.filter((b) => b.status === s).length })).filter((s) => s.count > 0),
        liveJobs: todayRows.filter((b) => ['pending', 'confirmed', 'on_the_way', 'in_progress'].includes(b.status)).sort((a, b) => a.slot.localeCompare(b.slot)).slice(0, 7),
        topCategories: categoryRank(last30).slice(0, 6),
        topProviders: providerRank(last30).slice(0, 5),
        recentBookings: [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7),
        onlinePartners: db.partners.filter((p) => p.online && inScope(p.city, scope)).length,
      };
    }),

  superDashboard: () =>
    mock<SuperDashboard>(() => {
      requirePerm('analytics.view');
      const now = Date.now();
      const year = db.bookings.filter((b) => ts(b) >= now - 365 * DAY);
      const last30 = db.bookings.filter((b) => ts(b) >= now - 30 * DAY);
      const prev30 = db.bookings.filter((b) => ts(b) >= now - 60 * DAY && ts(b) < now - 30 * DAY);
      const since7 = now - 7 * DAY;
      return {
        kpis: {
          gmv: sum(completed(year), (b) => b.pricing.total),
          revenue: sum(completed(year), (b) => b.pricing.commission),
          bookings: year.length,
          customers: db.customers.length,
          providers: db.providers.filter((p) => p.status === 'approved').length,
          partners: db.partners.filter((p) => p.status === 'approved').length,
          admins: db.admins.filter((a) => a.status === 'active').length,
          cities: db.cities.filter((c) => c.active).length,
          gmvGrowth: growth(sum(completed(last30), (b) => b.pricing.total), sum(completed(prev30), (b) => b.pricing.total)),
          revenueGrowth: growth(sum(completed(last30), (b) => b.pricing.commission), sum(completed(prev30), (b) => b.pricing.commission)),
        },
        monthly: series(db.bookings, '12m'),
        cities: db.cities.map((c) => {
          const rows = db.bookings.filter((b) => b.city === c.name);
          const cur = completed(rows.filter((b) => ts(b) >= now - 30 * DAY));
          const prev = completed(rows.filter((b) => ts(b) >= now - 60 * DAY && ts(b) < now - 30 * DAY));
          return {
            name: c.name,
            active: c.active,
            gmv: sum(completed(rows.filter((b) => ts(b) >= now - 365 * DAY)), (b) => b.pricing.total),
            bookings: rows.length,
            providers: db.providers.filter((p) => p.city === c.name && p.status === 'approved').length,
            customers: db.customers.filter((x) => x.city === c.name).length,
            growth: growth(sum(cur, (b) => b.pricing.total), sum(prev, (b) => b.pricing.total)),
          };
        }),
        categoryRevenue: categoryRank(year).slice(0, 6).map((c) => ({ name: c.name, value: c.revenue })),
        health: db.systemServices.map(({ key, name, status, latencyMs }) => ({ key, name, status, latencyMs })),
        recentAudit: db.auditLogs.slice(0, 8),
        adminActivity: db.admins
          .filter((a) => a.status !== 'invited')
          .map((a) => ({
            id: a.id,
            name: a.name,
            avatar: a.avatar,
            role: db.roles.find((r) => r.id === a.roleId)?.name ?? '—',
            lastActiveAt: a.lastActiveAt,
            actions7d: db.auditLogs.filter((l) => l.actorId === a.id && new Date(l.at).getTime() >= since7).length,
          }))
          .sort((a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? '')),
        approvals: {
          providers: db.providers.filter((p) => p.status === 'pending').length,
          partners: db.partners.filter((p) => p.status === 'pending').length,
          payouts: db.payouts.filter((p) => p.status === 'requested').length,
          invites: db.admins.filter((a) => a.status === 'invited').length,
        },
      };
    }),

  report: (range: DateRange, city?: string) =>
    mock<Report>(() => {
      requirePerm('reports.view');
      const days = RANGE_DAYS[range];
      const now = Date.now();
      const all = scoped(city);
      const rows = all.filter((b) => ts(b) >= now - days * DAY);
      const prev = all.filter((b) => ts(b) >= now - 2 * days * DAY && ts(b) < now - days * DAY);
      const done = completed(rows);
      const prevDone = completed(prev);
      const customersIn = new Map<string, number>();
      rows.forEach((b) => customersIn.set(b.customerId, (customersIn.get(b.customerId) ?? 0) + 1));
      const mix = new Map<string, { count: number; amount: number }>();
      rows.filter((b) => b.status !== 'cancelled' && b.status !== 'rejected').forEach((b) => {
        const m = mix.get(b.payment.method) ?? { count: 0, amount: 0 };
        m.count += 1;
        m.amount += b.pricing.total;
        mix.set(b.payment.method, m);
      });
      const svc = new Map<string, { bookings: number; gmv: number }>();
      rows.forEach((b) =>
        b.items.forEach((it) => {
          const m = svc.get(it.serviceId) ?? { bookings: 0, gmv: 0 };
          m.bookings += 1;
          if (b.status === 'completed') m.gmv += it.unitPrice * it.quantity;
          svc.set(it.serviceId, m);
        }),
      );
      const cityNames = [...new Set(rows.map((b) => b.city))];
      return {
        range,
        summary: {
          gmv: sum(done, (b) => b.pricing.total),
          revenue: sum(done, (b) => b.pricing.commission),
          bookings: rows.length,
          completed: done.length,
          cancelled: rows.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length,
          aov: done.length ? sum(done, (b) => b.pricing.total) / done.length : 0,
          newCustomers: db.customers.filter((c) => (!city || c.city === city) && new Date(c.createdAt).getTime() >= now - days * DAY).length,
          repeatRate: customersIn.size ? [...customersIn.values()].filter((n) => n > 1).length / customersIn.size : 0,
          refunds: sum(rows, (b) => b.payment.refundedAmount ?? 0),
        },
        previous: {
          gmv: sum(prevDone, (b) => b.pricing.total),
          revenue: sum(prevDone, (b) => b.pricing.commission),
          bookings: prev.length,
          aov: prevDone.length ? sum(prevDone, (b) => b.pricing.total) / prevDone.length : 0,
        },
        series: series(all, range),
        byCategory: categoryRank(rows),
        byCity: cityNames
          .map((name) => {
            const r = rows.filter((b) => b.city === name);
            const d = completed(r);
            return { name, bookings: r.length, gmv: sum(d, (b) => b.pricing.total), revenue: sum(d, (b) => b.pricing.commission), completion: r.length ? d.length / r.length : 0 };
          })
          .sort((a, b) => b.gmv - a.gmv),
        paymentMix: [...mix.entries()].map(([method, m]) => ({ method, ...m })).sort((a, b) => b.amount - a.amount),
        topProviders: providerRank(rows).slice(0, 8),
        topServices: [...svc.entries()]
          .map(([id, m]) => {
            const s = db.services.find((x) => x.id === id);
            return { id, title: s?.title ?? id, provider: s?.providerName ?? '', ...m };
          })
          .sort((a, b) => b.bookings - a.bookings)
          .slice(0, 8),
        peakHours: Array.from({ length: 13 }, (_, i) => {
          const h = i + 7;
          return { hour: `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`, bookings: rows.filter((b) => Number(b.slot.slice(0, 2)) === h).length };
        }),
      };
    }),

  analytics: (range: DateRange) =>
    mock<Analytics>(() => {
      requirePerm('analytics.view');
      const now = Date.now();
      const days = RANGE_DAYS[range];
      const rows = db.bookings.filter((b) => ts(b) >= now - days * DAY);
      const reached = (s: BookingStatus) => rows.filter((b) => b.timeline.some((e) => e.status === s)).length;
      // Cohorts by first booking month (last 6 months)
      const firstBooking = new Map<string, number>();
      [...db.bookings].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((b) => !firstBooking.has(b.customerId) && firstBooking.set(b.customerId, ts(b)));
      const monthIdx = (t: number) => {
        const d = new Date(t);
        return d.getFullYear() * 12 + d.getMonth();
      };
      const nowIdx = monthIdx(now);
      const cohorts = Array.from({ length: 6 }, (_, i) => {
        const idx = nowIdx - 5 + i;
        const members = [...firstBooking.entries()].filter(([, t]) => monthIdx(t) === idx).map(([id]) => id);
        const label = new Date(Math.floor(idx / 12), idx % 12, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        const retention = Array.from({ length: 6 }, (_, k) => {
          if (k === 0) return members.length ? 1 : null;
          if (idx + k > nowIdx) return null;
          if (!members.length) return 0;
          const active = members.filter((cid) => db.bookings.some((b) => b.customerId === cid && monthIdx(ts(b)) === idx + k)).length;
          return active / members.length;
        });
        return { cohort: label, size: members.length, retention };
      });
      const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const heatmap = weekdays.map((day, di) => ({
        day,
        hours: Array.from({ length: 13 }, (_, hi) =>
          rows.filter((b) => {
            const d = new Date(`${b.scheduledDate}T${b.slot}:00`);
            return (d.getDay() + 6) % 7 === di && d.getHours() === hi + 7;
          }).length,
        ),
      }));
      const parents = db.categories.filter((c) => !c.parentId);
      const supplyDemand = parents
        .map((c) => {
          const providers = db.providers.filter((p) => p.status === 'approved' && p.categoryIds.includes(c.id)).length;
          const bookings = rows.filter((b) => b.categoryId === c.id).length;
          return { name: c.name, providers, bookings, perProvider: providers ? Math.round(bookings / providers) : bookings };
        })
        .sort((a, b) => b.perProvider - a.perProvider);
      const months = buckets('12m');
      const customerGrowth = months.map(({ label, start, end }) => ({
        label,
        total: db.customers.filter((c) => new Date(c.createdAt).getTime() < end).length,
        new: db.customers.filter((c) => {
          const t = new Date(c.createdAt).getTime();
          return t >= start && t < end;
        }).length,
      }));
      const cityComparison = db.cities
        .filter((c) => c.active)
        .map((c) => {
          const r = rows.filter((b) => b.city === c.name);
          const d = completed(r);
          const rv = db.reviews.filter((x) => x.status === 'published' && db.providers.find((p) => p.id === x.providerId)?.city === c.name);
          return {
            name: c.name,
            gmv: sum(d, (b) => b.pricing.total),
            bookings: r.length,
            completion: r.length ? d.length / r.length : 0,
            rating: rv.length ? sum(rv, (x) => x.rating) / rv.length : 0,
            aov: d.length ? sum(d, (b) => b.pricing.total) / d.length : 0,
            cancelRate: r.length ? r.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length / r.length : 0,
          };
        });
      const ratingTrend = months.map(({ label, start, end }) => {
        const rv = db.reviews.filter((x) => {
          const t = new Date(x.createdAt).getTime();
          return t >= start && t < end;
        });
        return { label, rating: rv.length ? Math.round((sum(rv, (x) => x.rating) / rv.length) * 100) / 100 : 0 };
      });
      return {
        funnel: [
          { stage: 'Placed', value: rows.length },
          { stage: 'Confirmed', value: reached('confirmed') },
          { stage: 'Started', value: reached('in_progress') },
          { stage: 'Completed', value: reached('completed') },
          { stage: 'Reviewed', value: rows.filter((b) => b.rating).length },
        ],
        cohorts,
        heatmap,
        supplyDemand,
        customerGrowth,
        cityComparison,
        ratingTrend,
      };
    }),

  notifications: () =>
    mock<AdminNotification[]>(() => {
      const me = currentAdmin();
      return db.notifications.filter((n) => !n.permission || me.role.permissions.includes(n.permission));
    }, { latency: 150 }),
  markRead: (id: string | 'all') =>
    mock(
      () => {
        const me = currentAdmin();
        db.notifications.forEach((n) => {
          if ((id === 'all' || n.id === id) && (!n.permission || me.role.permissions.includes(n.permission))) n.read = true;
        });
        return { ok: true as const };
      },
      { write: true, latency: 120 },
    ),
};

export type InsightsApi = typeof mockImpl;

const httpImpl: InsightsApi = {
  adminDashboard: () => http('/dashboard'),
  superDashboard: () => http('/dashboard/platform'),
  report: (range, city) => http('/reports', { query: { range, city } }),
  analytics: (range) => http('/analytics', { query: { range } }),
  notifications: () => http('/notifications'),
  markRead: (id) => http(id === 'all' ? '/notifications/read-all' : `/notifications/${id}/read`, { method: 'POST' }),
};

export const insightsApi: InsightsApi = env.useMocks ? mockImpl : httpImpl;
