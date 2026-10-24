import { Link } from 'react-router';
import { Building2, ChartPie, ChevronRight, FileClock, IndianRupee, Store, UserCog, Users, Wallet } from 'lucide-react';
import { AreaTrend, Donut } from '@/components/charts';
import { Avatar, Badge, Card, CardHeader, DataTable, ErrorState, LinkButton, PageHeader, PageLoader, StatCard, StatusBadge } from '@/components/ui';
import { chartColors } from '@/config/theme';
import { useAdminDashboard, useSuperDashboard } from '@/hooks/queries';
import { useAdmin, usePanel } from '@/hooks/useAccess';
import { cn } from '@/lib/cn';
import { formatMoney, formatMoneyCompact, formatNumber, timeAgo } from '@/lib/format';
import { HEALTH, SEVERITY } from '@/lib/status';
import { AttentionStrip } from '../dashboard/AdminDashboard';

export default function SuperDashboard() {
  const q = useSuperDashboard();
  const ops = useAdminDashboard();
  const admin = useAdmin()!;
  const { to } = usePanel();
  return (
    <>
      <PageHeader
        title="Platform overview"
        meta={<Badge tone="highlight">Super Admin</Badge>}
        description={`Signed in as ${admin.name}. Everything across cities, teams and systems.`}
        actions={
          <>
            <LinkButton to={to('/audit')} variant="outline" size="sm" icon={FileClock}>
              Audit log
            </LinkButton>
            <LinkButton to={to('/analytics')} variant="panel" size="sm" icon={ChartPie}>
              Analytics
            </LinkButton>
          </>
        }
      />
      {ops.data ? <AttentionStrip a={ops.data.attention} /> : null}
      {q.isPending ? (
        <PageLoader />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        (() => {
          const d = q.data;
          const k = d.kpis;
          return (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <StatCard label="GMV, last 12 months" value={formatMoneyCompact(k.gmv)} icon={IndianRupee} tone="highlight" delta={k.gmvGrowth} deltaLabel="30d vs prev. 30d" spark={d.monthly.map((m) => m.gmv)} to={to('/reports?range=12m')} />
                <StatCard label="Platform revenue, 12 months" value={formatMoneyCompact(k.revenue)} icon={Wallet} tone="success" delta={k.revenueGrowth} deltaLabel="30d vs prev. 30d" spark={d.monthly.map((m) => m.revenue)} to={to('/payments')} />
                <StatCard label="Customers" value={formatNumber(k.customers)} icon={Users} tone="primary" hint={`${formatNumber(k.bookings)} bookings in 12 months`} to={to('/customers')} />
                <StatCard label="Supply" value={`${k.providers} + ${k.partners}`} icon={Store} tone="accent" hint="Approved providers + delivery partners" to={to('/providers')} />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader title="GMV and revenue" subtitle="Monthly, completed bookings" />
                  <AreaTrend data={d.monthly} x="label" series={[{ key: 'gmv', label: 'GMV', color: chartColors.highlight }, { key: 'revenue', label: 'Revenue', color: chartColors.success }]} yFormat={formatMoneyCompact} format={{ gmv: formatMoney, revenue: formatMoney }} height={270} />
                </Card>
                <Card>
                  <CardHeader title="Revenue by category" subtitle="Last 12 months" />
                  <Donut data={d.categoryRevenue} format={formatMoneyCompact} height={170} centerValue={formatMoneyCompact(d.categoryRevenue.reduce((s, c) => s + c.value, 0))} centerLabel="top 6" />
                </Card>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <div className="min-w-0 xl:col-span-2">
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-md font-semibold text-ink">Cities</h2>
                    <Link to={to('/cities')} className="focus-ring rounded text-sm font-semibold text-panel-ink hover:underline">
                      Manage cities
                    </Link>
                  </div>
                  <DataTable
                    caption="City performance"
                    data={d.cities}
                    rowKey={(c) => c.name}
                    columns={[
                      { key: 'n', header: 'City', mobile: 'title', sortValue: (c) => c.name, cell: (c) => <span className="flex items-center gap-2 font-semibold text-ink"><Building2 size={15} className="text-ink-3" />{c.name}</span> },
                      { key: 'g', header: 'GMV (12m)', align: 'right', sortValue: (c) => c.gmv, cell: (c) => <span className="font-semibold tabular text-ink">{formatMoneyCompact(c.gmv)}</span> },
                      { key: 'gr', header: '30d growth', align: 'right', sortValue: (c) => c.growth, cell: (c) => (c.active ? <span className={cn('font-semibold tabular', c.growth >= 0 ? 'text-success-600' : 'text-danger-600')}>{c.growth >= 0 ? '+' : ''}{(c.growth * 100).toFixed(0)}%</span> : '—') },
                      { key: 'b', header: 'Bookings', align: 'right', hideBelow: 'lg', sortValue: (c) => c.bookings, cell: (c) => <span className="tabular">{formatNumber(c.bookings)}</span> },
                      { key: 'p', header: 'Providers', align: 'right', hideBelow: 'lg', sortValue: (c) => c.providers, cell: (c) => <span className="tabular">{c.providers}</span> },
                      { key: 's', header: 'Status', mobile: 'aside', cell: (c) => <Badge tone={c.active ? 'success' : 'neutral'} dot size="xs">{c.active ? 'Live' : 'Launching'}</Badge> },
                    ]}
                  />
                </div>
                <Card>
                  <CardHeader
                    title="System health"
                    action={
                      <Link to={to('/system')} className="focus-ring rounded text-sm font-semibold text-panel-ink hover:underline">
                        Details
                      </Link>
                    }
                  />
                  <ul className="flex flex-col gap-2.5">
                    {d.health.map((s) => (
                      <li key={s.key} className="flex items-center gap-2.5 text-sm">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', s.status === 'operational' ? 'bg-success-500' : s.status === 'degraded' ? 'bg-warning-500 animate-pulse' : 'bg-danger-500')} />
                        <span className="min-w-0 flex-1 truncate text-ink-2">{s.name}</span>
                        <span className="tabular text-xs text-ink-3">{s.latencyMs} ms</span>
                        {s.status !== 'operational' ? <StatusBadge map={HEALTH} value={s.status} size="xs" /> : null}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader
                    title="Admin team"
                    subtitle="Activity in the last 7 days"
                    action={
                      <Link to={to('/admins')} className="focus-ring rounded text-sm font-semibold text-panel-ink hover:underline">
                        Manage team
                      </Link>
                    }
                  />
                  <ul className="flex flex-col gap-1">
                    {d.adminActivity.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 rounded-xl p-2">
                        <Avatar name={a.name} src={a.avatar} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{a.name}</span>
                          <span className="block truncate text-xs text-ink-3">
                            {a.role}, active {a.lastActiveAt ? timeAgo(a.lastActiveAt) : 'never'}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-sm font-bold tabular text-ink">{a.actions7d}</span>
                          <span className="text-2xs text-ink-3">actions</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {d.approvals.invites ? (
                    <Link to={to('/admins?status=invited')} className="focus-ring mt-3 flex items-center justify-between rounded-xl bg-info-50 px-3 py-2 text-sm font-medium text-info-700 dark:bg-info-500/10 dark:text-info-400">
                      <span className="flex items-center gap-2">
                        <UserCog size={15} /> {d.approvals.invites} pending invitation{d.approvals.invites > 1 ? 's' : ''}
                      </span>
                      <ChevronRight size={15} />
                    </Link>
                  ) : null}
                </Card>
                <Card>
                  <CardHeader
                    title="Recent admin activity"
                    action={
                      <Link to={to('/audit')} className="focus-ring rounded text-sm font-semibold text-panel-ink hover:underline">
                        Full log
                      </Link>
                    }
                  />
                  <ol className="flex flex-col">
                    {d.recentAudit.map((l) => (
                      <li key={l.id} className="flex gap-3 border-b border-line py-2.5 last:border-0">
                        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', l.severity === 'critical' ? 'bg-danger-500' : l.severity === 'warning' ? 'bg-warning-500' : 'bg-info-500')} title={SEVERITY[l.severity].label} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">{l.summary}</span>
                          <span className="text-xs text-ink-3">
                            {l.actorName}, {timeAgo(l.at)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </div>
            </>
          );
        })()
      )}
    </>
  );
}
