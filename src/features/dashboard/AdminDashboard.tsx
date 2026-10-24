import { Link, useNavigate } from 'react-router';
import { Activity, AlertTriangle, CalendarCheck2, ChevronRight, IndianRupee, PackageCheck, Star, Store, Wallet, Bike, LifeBuoy } from 'lucide-react';
import { AreaTrend, BarSeries, Donut } from '@/components/charts';
import { Avatar, Badge, Card, CardHeader, DataTable, EmptyState, ErrorState, LinkButton, MiniStat, PageHeader, PageLoader, StatCard, StatusBadge } from '@/components/ui';
import { chartColors } from '@/config/theme';
import { useAdminDashboard } from '@/hooks/queries';
import { useAdmin, usePanel } from '@/hooks/useAccess';
import { formatMoney, formatMoneyCompact, formatNumber, formatPercent, formatTime } from '@/lib/format';
import { BOOKING_STATUS } from '@/lib/status';
import type { AdminDashboard as Data } from '@/services/api/insights.api';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export function AttentionStrip({ a }: { a: Data['attention'] }) {
  const { to } = usePanel();
  const items = [
    { n: a.pendingProviders, label: 'provider approvals', to: '/providers?status=pending', icon: Store },
    { n: a.pendingPartners, label: 'partner approvals', to: '/partners?status=pending', icon: Bike },
    { n: a.pendingPayouts, label: 'payouts to process', to: '/payouts?status=requested', icon: Wallet },
    { n: a.openTickets, label: 'open tickets', to: '/support?status=open', icon: LifeBuoy },
    { n: a.flaggedReviews, label: 'flagged reviews', to: '/reviews?status=flagged', icon: Star },
    { n: a.unassignedTasks, label: 'unassigned pickups', to: '/dispatch?status=available', icon: PackageCheck },
  ].filter((x) => x.n > 0);
  if (!items.length) return null;
  return (
    <div className="mb-5 flex flex-col gap-2.5 rounded-card border border-accent-200 bg-accent-50 p-3 sm:flex-row sm:items-center dark:border-accent-500/25 dark:bg-accent-500/10">
      <p className="flex shrink-0 items-center gap-2 px-1 text-sm font-semibold text-accent-700 dark:text-accent-300">
        <AlertTriangle size={16} /> Needs attention
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x) => (
          <Link key={x.label} to={to(x.to.split('?')[0]) + '?' + x.to.split('?')[1]} className="focus-ring group inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 shadow-xs transition-colors hover:text-ink">
            <x.icon size={14} className="text-accent-600" />
            <b className="tabular text-ink">{x.n}</b> {x.label}
            <ChevronRight size={13} className="text-ink-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const q = useAdminDashboard();
  const admin = useAdmin()!;
  const { to } = usePanel();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${admin.name.split(' ')[0]}`}
        description={`${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${admin.cityScope.length ? ` — showing ${admin.cityScope.join(' & ')}` : ''}`}
        actions={
          <>
            <LinkButton to={to('/bookings?status=active')} variant="outline" size="sm" icon={Activity}>
              Live bookings
            </LinkButton>
            <LinkButton to={to('/reports')} variant="panel" size="sm">
              View reports
            </LinkButton>
          </>
        }
      />
      {q.isPending ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <Content d={q.data} onBooking={(id) => navigate(to(`/bookings/${id}`))} />
      )}
    </>
  );
}

function Content({ d, onBooking }: { d: Data; onBooking: (id: string) => void }) {
  const { to } = usePanel();
  const k = d.kpis;
  const totalStatus = d.statusMix.reduce((s, x) => s + x.count, 0);
  const toneVar: Record<string, string> = { warning: chartColors.warning, primary: chartColors.primary, info: chartColors.info, highlight: chartColors.highlight, success: chartColors.success, danger: chartColors.danger, neutral: 'var(--color-neutral-400)' };
  return (
    <>
      <AttentionStrip a={d.attention} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Gross booking value (30d)" value={formatMoneyCompact(k.gmv30)} icon={IndianRupee} tone="primary" delta={k.gmvGrowth} spark={d.trend.map((t) => t.gmv)} to={to('/reports')} />
        <StatCard label="Platform revenue (30d)" value={formatMoneyCompact(k.revenue30)} icon={Wallet} tone="success" delta={k.revenueGrowth} spark={d.trend.map((t) => t.revenue)} to={to('/reports')} />
        <StatCard label="Bookings (30d)" value={formatNumber(k.bookings30)} icon={CalendarCheck2} tone="accent" delta={k.bookingsGrowth} spark={d.trend.map((t) => t.bookings)} to={to('/bookings')} />
        <StatCard label="Jobs in progress now" value={formatNumber(k.activeJobs)} icon={Activity} tone="highlight" hint={`${k.todayBookings} booked for today, ${formatMoneyCompact(k.todayGmv)}`} to={to('/bookings?status=active')} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Bookings and GMV" subtitle="Last 30 days, completed value" />
          <AreaTrend
            data={d.trend}
            x="label"
            series={[
              { key: 'gmv', label: 'GMV', color: chartColors.primary },
              { key: 'bookings', label: 'Bookings', color: chartColors.accent, right: true },
            ]}
            yFormat={(v) => formatMoneyCompact(v)}
            format={{ gmv: formatMoney, bookings: formatNumber }}
            height={360}
          />
        </Card>
        <Card>
          <CardHeader title="Booking status" subtitle="Last 30 days" />
          <Donut
            data={d.statusMix.map((s) => ({ name: BOOKING_STATUS[s.status].label, value: s.count, color: toneVar[BOOKING_STATUS[s.status].tone] }))}
            centerValue={formatNumber(totalStatus)}
            centerLabel="bookings"
            height={168}
          />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <MiniStat label="Avg. rating" value={`${k.avgRating.toFixed(2)} ★`} />
            <MiniStat label="Cancellation rate" value={formatPercent(k.cancellationRate, 1)} tone={k.cancellationRate > 0.15 ? 'danger' : undefined} />
            <MiniStat label="First-time customers" value={formatNumber(k.newCustomers30)} />
            <MiniStat label="Partners online" value={formatNumber(d.onlinePartners)} tone="success" />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                Today’s schedule
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
                </span>
              </span>
            }
            subtitle="Upcoming and running jobs"
            action={
              <Link to={to('/bookings?status=active')} className="focus-ring rounded text-sm font-semibold text-panel-ink hover:underline">
                See all
              </Link>
            }
          />
          {d.liveJobs.length ? (
            <ul className="-mx-2 flex flex-col">
              {d.liveJobs.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => onBooking(b.id)} className="focus-ring flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2">
                    <span className="w-16 shrink-0 text-sm font-bold tabular text-ink">{formatTime(b.slot)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{b.items[0].title}</span>
                      <span className="block truncate text-xs text-ink-3">
                        {b.customerName} with {b.providerName}
                      </span>
                    </span>
                    <StatusBadge map={BOOKING_STATUS} value={b.status} size="xs" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="Nothing scheduled right now" description="New bookings for today will appear here." />
          )}
        </Card>
        <Card>
          <CardHeader title="Top categories" subtitle="By completed GMV, last 30 days" />
          <BarSeries data={d.topCategories.map((c) => ({ ...c, name: c.name.replace(' & ', ' & ') }))} x="name" series={[{ key: 'gmv', label: 'GMV' }]} horizontal colorByIndex yFormat={(v) => formatMoneyCompact(v)} format={{ gmv: formatMoney }} height={250} legend={false} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <DataTable
            caption="Recent bookings"
            data={d.recentBookings}
            rowKey={(b) => b.id}
            onRowClick={(b) => onBooking(b.id)}
            columns={[
              { key: 'code', header: 'Booking', mobile: 'title', cell: (b) => <span className="block"><span className="font-semibold text-ink">#{b.code}</span><span className="block truncate text-xs text-ink-3">{b.items[0].title}</span></span> },
              { key: 'cust', header: 'Customer', cell: (b) => <span className="truncate">{b.customerName}</span>, hideBelow: 'lg' },
              { key: 'city', header: 'City', cell: (b) => b.city, hideBelow: 'xl' },
              { key: 'st', header: 'Status', mobile: 'aside', cell: (b) => <StatusBadge map={BOOKING_STATUS} value={b.status} size="xs" /> },
              { key: 'amt', header: 'Amount', align: 'right', cell: (b) => <span className="font-semibold tabular text-ink">{formatMoney(b.pricing.total)}</span> },
            ]}
            footer={
              <div className="border-t border-line px-4 py-2.5 text-right">
                <Link to={to('/bookings')} className="focus-ring rounded text-sm font-semibold text-panel-ink hover:underline">
                  All bookings
                </Link>
              </div>
            }
          />
        </div>
        <Card>
          <CardHeader title="Top providers" subtitle="Last 30 days" />
          <ol className="flex flex-col gap-1">
            {d.topProviders.map((p, i) => (
              <li key={p.id}>
                <Link to={to(`/providers/${p.id}`)} className="focus-ring flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
                  <span className="relative">
                    <Avatar name={p.name} size="md" square />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-neutral-900 text-2xs font-bold text-white dark:bg-white dark:text-neutral-900">{i + 1}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                    <span className="block text-xs text-ink-3">
                      {p.city}, {p.bookings} bookings
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-bold tabular text-ink">{formatMoneyCompact(p.gmv)}</span>
                    <Badge tone="warning" size="xs">
                      {p.rating.toFixed(1)} ★
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
