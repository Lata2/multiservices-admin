import { useNavigate } from 'react-router';
import { CalendarX2 } from 'lucide-react';
import { CategorySelect, CitySelect } from '@/components/domain';
import { ClearFilters, ExportButton, TablePager } from '@/components/domain/ListKit';
import { DataTable, EmptyState, ErrorState, Input, PageHeader, SearchInput, Select, StatusBadge, Tabs, Toolbar } from '@/components/ui';
import { useBookings } from '@/hooks/queries';
import { usePanel } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { fetchAll } from '@/lib/fetchAll';
import { formatDay, formatMoney, formatTime } from '@/lib/format';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '@/lib/status';
import { bookingsApi } from '@/services/api';
import type { BookingFilters } from '@/services/api/bookings.api';
import type { PaymentStatus } from '@/types/models';

type F = { status?: string; city?: string; categoryId?: string; paymentStatus?: string; from?: string; to?: string };

export default function BookingsPage() {
  const t = useTableState<F>({ sort: 'created', dir: 'desc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const filters = params as unknown as BookingFilters;
  const q = useBookings(filters);
  const navigate = useNavigate();
  const { to } = usePanel();
  const c = q.data?.counts;

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every booking across the marketplace — track, intervene, refund."
        actions={
          <ExportButton
            filename="bookings"
            load={() => fetchAll(bookingsApi.list, filters)}
            columns={[
              { header: 'Code', value: (b) => b.code },
              { header: 'Created', value: (b) => b.createdAt },
              { header: 'Scheduled', value: (b) => `${b.scheduledDate} ${b.slot}` },
              { header: 'Customer', value: (b) => b.customerName },
              { header: 'Provider', value: (b) => b.providerName },
              { header: 'City', value: (b) => b.city },
              { header: 'Services', value: (b) => b.items.map((i) => `${i.quantity}x ${i.title}`).join('; ') },
              { header: 'Status', value: (b) => BOOKING_STATUS[b.status].label },
              { header: 'Payment method', value: (b) => PAYMENT_METHOD[b.payment.method] },
              { header: 'Payment status', value: (b) => PAYMENT_STATUS[b.payment.status].label },
              { header: 'Total', value: (b) => b.pricing.total },
              { header: 'Commission', value: (b) => b.pricing.commission },
            ]}
          />
        }
      />
      <Tabs
        label="Booking status"
        className="mb-4"
        value={params.status ?? 'all'}
        onChange={(v) => t.setFilter('status', v)}
        tabs={[
          { value: 'all', label: 'All', count: c?.all },
          { value: 'active', label: 'Active', count: c?.active },
          { value: 'pending', label: 'Pending', count: c?.pending },
          { value: 'completed', label: 'Completed', count: c?.completed },
          { value: 'cancelled', label: 'Cancelled', count: c?.cancelled },
        ]}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search code, customer, provider…" className="sm:w-72" />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <CitySelect value={params.city ?? ''} onChange={(e) => t.setFilter('city', e.target.value)} containerClassName="sm:w-36" />
          <CategorySelect value={params.categoryId ?? ''} onChange={(e) => t.setFilter('categoryId', e.target.value)} containerClassName="sm:w-44" />
          <Select
            aria-label="Payment"
            compact
            placeholder="Any payment"
            value={params.paymentStatus ?? ''}
            onChange={(e) => t.setFilter('paymentStatus', e.target.value)}
            options={(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map((s) => ({ value: s, label: PAYMENT_STATUS[s].label }))}
            containerClassName="sm:w-36"
          />
          <Input aria-label="Scheduled from" type="date" value={params.from ?? ''} onChange={(e) => t.setFilter('from', e.target.value)} className="h-8.5 text-sm" containerClassName="sm:w-38" />
          <Input aria-label="Scheduled to" type="date" value={params.to ?? ''} onChange={(e) => t.setFilter('to', e.target.value)} className="h-8.5 text-sm" containerClassName="sm:w-38" />
        </div>
        <ClearFilters
          show={!!(params.city || params.categoryId || params.paymentStatus || params.from || params.to || params.search)}
          onClear={() => {
            setSearch('');
            t.reset();
          }}
        />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Bookings"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(b) => b.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          onRowClick={(b) => navigate(to(`/bookings/${b.id}`))}
          empty={<EmptyState icon={CalendarX2} title="No bookings match" description="Try a different status, date range or search." />}
          columns={[
            {
              key: 'code',
              header: 'Booking',
              sortKey: 'code',
              mobile: 'title',
              cell: (b) => (
                <span className="block min-w-0">
                  <span className="font-semibold text-ink">#{b.code}</span>
                  <span className="block max-w-56 truncate text-xs text-ink-3">
                    {b.items[0].title}
                    {b.items.length > 1 ? ` +${b.items.length - 1}` : ''}
                  </span>
                </span>
              ),
            },
            { key: 'customer', header: 'Customer', sortKey: 'customer', cell: (b) => <span className="block max-w-40 truncate">{b.customerName}</span> },
            { key: 'provider', header: 'Provider', sortKey: 'provider', hideBelow: 'lg', cell: (b) => <span className="block max-w-44 truncate">{b.providerName}</span> },
            {
              key: 'scheduled',
              header: 'Scheduled',
              sortKey: 'scheduled',
              cell: (b) => (
                <span className="whitespace-nowrap">
                  {formatDay(b.scheduledDate)}
                  <span className="block text-xs text-ink-3">{formatTime(b.slot)}</span>
                </span>
              ),
            },
            { key: 'city', header: 'City', hideBelow: 'xl', cell: (b) => b.city },
            {
              key: 'payment',
              header: 'Payment',
              hideBelow: 'lg',
              cell: (b) => (
                <span className="whitespace-nowrap">
                  <span className="block text-sm">{PAYMENT_METHOD[b.payment.method]}</span>
                  <StatusBadge map={PAYMENT_STATUS} value={b.payment.status} size="xs" />
                </span>
              ),
            },
            { key: 'status', header: 'Status', mobile: 'aside', cell: (b) => <StatusBadge map={BOOKING_STATUS} value={b.status} size="xs" /> },
            { key: 'total', header: 'Amount', sortKey: 'total', align: 'right', cell: (b) => <span className="font-semibold tabular text-ink">{formatMoney(b.pricing.total)}</span> },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
    </>
  );
}
