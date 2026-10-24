import { useState } from 'react';
import { AreaTrend, BarSeries, Funnel, Heatmap, LineTrend } from '@/components/charts';
import { Card, CardHeader, DataTable, ErrorState, PageHeader, PageLoader, Segmented } from '@/components/ui';
import { chartColors } from '@/config/theme';
import { useAnalytics } from '@/hooks/queries';
import { formatMoney, formatMoneyCompact, formatNumber, formatPercent } from '@/lib/format';
import type { Analytics } from '@/services/api/insights.api';
import type { DateRange } from '@/types/admin';

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>('90d');
  const q = useAnalytics(range);
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Conversion, retention, demand patterns and city benchmarks."
        actions={<Segmented label="Range" value={range} onChange={setRange} options={[{ value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: '12m', label: '12M' }]} />}
      />
      {q.isPending ? <PageLoader /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <Body a={q.data} />}
    </>
  );
}

function Body({ a }: { a: Analytics }) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Booking funnel" subtitle="Share of placed bookings reaching each stage" />
          <Funnel steps={a.funnel} />
        </Card>
        <Card>
          <CardHeader title="Customer retention" subtitle="Share of each month’s first-time customers who booked again" />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[480px] border-separate border-spacing-1 text-xs">
              <thead>
                <tr className="text-ink-3">
                  <th className="text-left font-medium">Cohort</th>
                  <th className="text-right font-medium">Size</th>
                  {['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map((m) => (
                    <th key={m} className="font-medium">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.cohorts.map((c) => (
                  <tr key={c.cohort}>
                    <th scope="row" className="whitespace-nowrap pr-2 text-left font-semibold text-ink">
                      {c.cohort}
                    </th>
                    <td className="pr-2 text-right tabular text-ink-2">{c.size}</td>
                    {c.retention.map((r, i) => (
                      <td
                        key={i}
                        className="h-8 min-w-12 rounded-md text-center font-semibold tabular"
                        style={r === null ? { background: 'transparent' } : { background: `color-mix(in oklab, var(--panel-solid) ${Math.round(8 + r * 85)}%, transparent)`, color: r > 0.45 ? '#fff' : 'var(--ink-2)' }}
                      >
                        {r === null ? '' : formatPercent(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="When customers book" subtitle="Scheduled slots by weekday and hour" />
        <Heatmap rows={a.heatmap.map((h) => ({ label: h.day, values: h.hours }))} columns={Array.from({ length: 13 }, (_, i) => { const h = i + 7; return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`; })} />
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Customer base" subtitle="Total customers and new sign-ups per month" />
          <AreaTrend data={a.customerGrowth} x="label" series={[{ key: 'total', label: 'Total', color: chartColors.highlight }, { key: 'new', label: 'New', color: chartColors.accent, right: true }]} height={240} />
        </Card>
        <Card>
          <CardHeader title="Average rating" subtitle="Monthly, all reviews" />
          <LineTrend data={a.ratingTrend.filter((r) => r.rating > 0)} x="label" series={[{ key: 'rating', label: 'Rating', color: chartColors.warning }]} domain={[3.5, 5]} yFormat={(v) => v.toFixed(1)} format={{ rating: (v) => `${v.toFixed(2)} ★` }} height={240} legend={false} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader title="Demand per provider" subtitle="Bookings per approved provider — high values signal supply gaps" />
          <BarSeries data={a.supplyDemand} x="name" series={[{ key: 'perProvider', label: 'Bookings per provider' }]} horizontal colorByIndex height={360} legend={false} />
        </Card>
        <div className="min-w-0">
          <h2 className="mb-2.5 text-md font-semibold text-ink">City benchmarks</h2>
          <DataTable
            caption="City benchmarks"
            data={a.cityComparison}
            rowKey={(c) => c.name}
            columns={[
              { key: 'n', header: 'City', mobile: 'title', sortValue: (c) => c.name, cell: (c) => <span className="font-semibold text-ink">{c.name}</span> },
              { key: 'g', header: 'GMV', align: 'right', mobile: 'aside', sortValue: (c) => c.gmv, cell: (c) => <span className="font-semibold tabular text-ink">{formatMoneyCompact(c.gmv)}</span> },
              { key: 'b', header: 'Bookings', align: 'right', sortValue: (c) => c.bookings, cell: (c) => <span className="tabular">{formatNumber(c.bookings)}</span> },
              { key: 'aov', header: 'AOV', align: 'right', hideBelow: 'lg', sortValue: (c) => c.aov, cell: (c) => <span className="tabular">{formatMoney(c.aov)}</span> },
              { key: 'c', header: 'Completion', align: 'right', sortValue: (c) => c.completion, cell: (c) => <span className="tabular">{formatPercent(c.completion)}</span> },
              { key: 'x', header: 'Cancels', align: 'right', hideBelow: 'lg', sortValue: (c) => c.cancelRate, cell: (c) => <span className="tabular">{formatPercent(c.cancelRate)}</span> },
              { key: 'r', header: 'Rating', align: 'right', sortValue: (c) => c.rating, cell: (c) => (c.rating ? `${c.rating.toFixed(2)} ★` : '—') },
            ]}
          />
        </div>
      </div>
    </>
  );
}
