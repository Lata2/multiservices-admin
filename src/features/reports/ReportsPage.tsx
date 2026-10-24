import { CalendarCheck2, Download, IndianRupee, Printer, Receipt, Repeat, Undo2, Wallet } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { AreaTrend, BarSeries, Donut } from '@/components/charts';
import { CitySelect } from '@/components/domain';
import { Button, Card, CardHeader, DataTable, ErrorState, Menu, PageHeader, PageLoader, ProgressBar, Segmented, StatCard } from '@/components/ui';
import { chartColors } from '@/config/theme';
import { useReport } from '@/hooks/queries';
import { exportCsv } from '@/lib/csv';
import { formatMoney, formatMoneyCompact, formatNumber, formatPercent } from '@/lib/format';
import { PAYMENT_METHOD } from '@/lib/status';
import type { Report } from '@/services/api/insights.api';
import type { DateRange } from '@/types/admin';
import type { PaymentMethod } from '@/types/models';

const RANGES: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '12m', label: '12M' },
];
const delta = (cur: number, prev: number) => (prev ? (cur - prev) / prev : undefined);

export default function ReportsPage() {
  const [sp, setSp] = useSearchParams();
  const range = (sp.get('range') as DateRange) || '30d';
  const city = sp.get('city') || undefined;
  const q = useReport(range, city);
  const set = (k: string, v?: string) =>
    setSp((p) => {
      const n = new URLSearchParams(p);
      if (v) n.set(k, v);
      else n.delete(k);
      return n;
    }, { replace: true });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Marketplace performance compared with the previous period."
        actions={
          <>
            <CitySelect value={city ?? ''} onChange={(e) => set('city', e.target.value)} containerClassName="w-36" />
            <Segmented label="Range" value={range} onChange={(v) => set('range', v)} options={RANGES} />
            {q.data ? <ExportMenu r={q.data} /> : null}
            <Button variant="ghost" size="sm" icon={Printer} onClick={() => window.print()} className="no-print max-sm:hidden">
              Print
            </Button>
          </>
        }
      />
      {q.isPending ? <PageLoader /> : q.isError ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <Body r={q.data} />}
    </>
  );
}

function ExportMenu({ r }: { r: Report }) {
  const stamp = `${r.range}-${new Date().toISOString().slice(0, 10)}`;
  return (
    <Menu
      label="Export"
      trigger={(p) => (
        <Button variant="outline" size="sm" icon={Download} {...p}>
          Export
        </Button>
      )}
      items={[
        { label: 'Trend (CSV)', onSelect: () => exportCsv(`report-trend-${stamp}.csv`, r.series, [{ header: 'Period', value: (x) => x.label }, { header: 'GMV', value: (x) => x.gmv }, { header: 'Revenue', value: (x) => x.revenue }, { header: 'Bookings', value: (x) => x.bookings }]) },
        { label: 'Categories (CSV)', onSelect: () => exportCsv(`report-categories-${stamp}.csv`, r.byCategory, [{ header: 'Category', value: (x) => x.name }, { header: 'Bookings', value: (x) => x.bookings }, { header: 'GMV', value: (x) => x.gmv }, { header: 'Revenue', value: (x) => x.revenue }]) },
        { label: 'Cities (CSV)', onSelect: () => exportCsv(`report-cities-${stamp}.csv`, r.byCity, [{ header: 'City', value: (x) => x.name }, { header: 'Bookings', value: (x) => x.bookings }, { header: 'GMV', value: (x) => x.gmv }, { header: 'Revenue', value: (x) => x.revenue }, { header: 'Completion', value: (x) => x.completion.toFixed(3) }]) },
        { label: 'Providers (CSV)', onSelect: () => exportCsv(`report-providers-${stamp}.csv`, r.topProviders, [{ header: 'Provider', value: (x) => x.name }, { header: 'City', value: (x) => x.city }, { header: 'Bookings', value: (x) => x.bookings }, { header: 'GMV', value: (x) => x.gmv }, { header: 'Rating', value: (x) => x.rating }]) },
      ]}
    />
  );
}

function Body({ r }: { r: Report }) {
  const s = r.summary;
  const label = r.range === '12m' ? 'vs prev. 12 months' : `vs prev. ${r.range.replace('d', ' days')}`;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Gross booking value" value={formatMoneyCompact(s.gmv)} icon={IndianRupee} tone="primary" delta={delta(s.gmv, r.previous.gmv)} deltaLabel={label} />
        <StatCard label="Platform revenue" value={formatMoneyCompact(s.revenue)} icon={Wallet} tone="success" delta={delta(s.revenue, r.previous.revenue)} deltaLabel={label} />
        <StatCard label="Bookings" value={formatNumber(s.bookings)} icon={CalendarCheck2} tone="accent" delta={delta(s.bookings, r.previous.bookings)} deltaLabel={label} />
        <StatCard label="Average order value" value={formatMoney(s.aov)} icon={Receipt} tone="highlight" delta={delta(s.aov, r.previous.aov)} deltaLabel={label} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric label="Completion rate" value={s.bookings ? s.completed / s.bookings : 0} tone="success" />
        <Metric label="Cancellation rate" value={s.bookings ? s.cancelled / s.bookings : 0} tone="danger" />
        <Metric label="Repeat customers" value={s.repeatRate} tone="primary" icon={Repeat} />
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-50 text-info-600 dark:bg-info-500/15">
            <Undo2 size={18} />
          </span>
          <span>
            <span className="block text-sm text-ink-3">Refunded</span>
            <span className="block text-lg font-bold tabular text-ink">{formatMoney(s.refunds)}</span>
          </span>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="GMV and revenue" subtitle="Completed bookings" />
          <AreaTrend data={r.series} x="label" series={[{ key: 'gmv', label: 'GMV', color: chartColors.primary }, { key: 'revenue', label: 'Revenue', color: chartColors.success }]} yFormat={formatMoneyCompact} format={{ gmv: formatMoney, revenue: formatMoney }} height={260} />
        </Card>
        <Card>
          <CardHeader title="Payment mix" subtitle="By value" />
          <Donut data={r.paymentMix.map((m) => ({ name: PAYMENT_METHOD[m.method as PaymentMethod] ?? m.method, value: m.amount }))} format={formatMoneyCompact} height={160} centerValue={formatMoneyCompact(r.paymentMix.reduce((a, m) => a + m.amount, 0))} centerLabel="paid" />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Bookings over time" />
          <BarSeries data={r.series} x="label" series={[{ key: 'bookings', label: 'Bookings', color: chartColors.accent }]} height={230} legend={false} />
        </Card>
        <Card>
          <CardHeader title="Peak booking hours" subtitle="Slot start time" />
          <BarSeries data={r.peakHours} x="hour" series={[{ key: 'bookings', label: 'Bookings', color: chartColors.highlight }]} height={230} legend={false} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <h2 className="mb-2.5 text-md font-semibold text-ink">Categories</h2>
          <DataTable
            caption="Category performance"
            data={r.byCategory}
            rowKey={(x) => x.id}
            dense
            columns={[
              { key: 'name', header: 'Category', mobile: 'title', sortValue: (x) => x.name, cell: (x) => <span className="font-medium text-ink">{x.name}</span> },
              { key: 'b', header: 'Bookings', align: 'right', sortValue: (x) => x.bookings, cell: (x) => <span className="tabular">{x.bookings}</span> },
              { key: 'g', header: 'GMV', align: 'right', sortValue: (x) => x.gmv, cell: (x) => <span className="tabular">{formatMoneyCompact(x.gmv)}</span> },
              { key: 'r', header: 'Revenue', align: 'right', mobile: 'aside', sortValue: (x) => x.revenue, cell: (x) => <span className="font-semibold tabular text-ink">{formatMoneyCompact(x.revenue)}</span> },
            ]}
          />
        </div>
        <div className="min-w-0">
          <h2 className="mb-2.5 text-md font-semibold text-ink">Cities</h2>
          <DataTable
            caption="City performance"
            data={r.byCity}
            rowKey={(x) => x.name}
            dense
            columns={[
              { key: 'name', header: 'City', mobile: 'title', sortValue: (x) => x.name, cell: (x) => <span className="font-medium text-ink">{x.name}</span> },
              { key: 'b', header: 'Bookings', align: 'right', sortValue: (x) => x.bookings, cell: (x) => <span className="tabular">{x.bookings}</span> },
              { key: 'g', header: 'GMV', align: 'right', mobile: 'aside', sortValue: (x) => x.gmv, cell: (x) => <span className="font-semibold tabular text-ink">{formatMoneyCompact(x.gmv)}</span> },
              { key: 'c', header: 'Completion', align: 'right', sortValue: (x) => x.completion, cell: (x) => <span className="tabular">{formatPercent(x.completion)}</span> },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <h2 className="mb-2.5 text-md font-semibold text-ink">Top providers</h2>
          <DataTable
            caption="Top providers"
            data={r.topProviders}
            rowKey={(x) => x.id}
            dense
            columns={[
              { key: 'n', header: 'Provider', mobile: 'title', cell: (x) => <span className="block"><span className="font-medium text-ink">{x.name}</span><span className="block text-xs text-ink-3">{x.city}</span></span> },
              { key: 'b', header: 'Bookings', align: 'right', sortValue: (x) => x.bookings, cell: (x) => <span className="tabular">{x.bookings}</span> },
              { key: 'r', header: 'Rating', align: 'right', sortValue: (x) => x.rating, cell: (x) => `${x.rating.toFixed(1)} ★` },
              { key: 'g', header: 'GMV', align: 'right', mobile: 'aside', sortValue: (x) => x.gmv, cell: (x) => <span className="font-semibold tabular text-ink">{formatMoneyCompact(x.gmv)}</span> },
            ]}
          />
        </div>
        <div className="min-w-0">
          <h2 className="mb-2.5 text-md font-semibold text-ink">Top services</h2>
          <DataTable
            caption="Top services"
            data={r.topServices}
            rowKey={(x) => x.id}
            dense
            columns={[
              { key: 't', header: 'Service', mobile: 'title', cell: (x) => <span className="block"><span className="block max-w-64 truncate font-medium text-ink">{x.title}</span><span className="block text-xs text-ink-3">{x.provider}</span></span> },
              { key: 'b', header: 'Bookings', align: 'right', mobile: 'aside', sortValue: (x) => x.bookings, cell: (x) => <span className="tabular">{x.bookings}</span> },
              { key: 'g', header: 'GMV', align: 'right', sortValue: (x) => x.gmv, cell: (x) => <span className="tabular">{formatMoneyCompact(x.gmv)}</span> },
            ]}
          />
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, tone, icon: I }: { label: string; value: number; tone: 'success' | 'danger' | 'primary'; icon?: typeof Repeat }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-ink-3">
          {I ? <I size={14} /> : null}
          {label}
        </span>
        <span className="text-lg font-bold tabular text-ink">{formatPercent(value, 1)}</span>
      </div>
      <ProgressBar value={value} tone={tone} className="mt-3" label={label} />
    </Card>
  );
}
