import { useNavigate } from 'react-router';
import { Users } from 'lucide-react';
import { CitySelect } from '@/components/domain';
import { ClearFilters, ExportButton, TablePager } from '@/components/domain/ListKit';
import { DataTable, EmptyState, ErrorState, PageHeader, PersonCell, SearchInput, Segmented, Select, StatusBadge, Toolbar } from '@/components/ui';
import { useCustomers } from '@/hooks/queries';
import { usePanel } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { fetchAll } from '@/lib/fetchAll';
import { formatDate, formatMoney, timeAgo } from '@/lib/format';
import { ACCOUNT_STATUS } from '@/lib/status';
import { customersApi } from '@/services/api';
import type { CustomerFilters } from '@/services/api/customers.api';

type F = { status?: string; city?: string; segment?: string };

export default function CustomersPage() {
  const t = useTableState<F>({ sort: 'joined', dir: 'desc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const filters = params as unknown as CustomerFilters;
  const q = useCustomers(filters);
  const navigate = useNavigate();
  const { to } = usePanel();
  const c = q.data?.counts;

  return (
    <>
      <PageHeader
        title="Customers"
        description="People booking services through the Servio app."
        actions={
          <ExportButton
            filename="customers"
            load={() => fetchAll(customersApi.list, filters)}
            columns={[
              { header: 'Name', value: (r) => r.name },
              { header: 'Email', value: (r) => r.email },
              { header: 'Phone', value: (r) => r.phone },
              { header: 'City', value: (r) => r.city },
              { header: 'Bookings', value: (r) => r.bookingsCount },
              { header: 'Total spent', value: (r) => r.totalSpent },
              { header: 'Wallet', value: (r) => r.walletBalance },
              { header: 'Status', value: (r) => r.status },
              { header: 'Joined', value: (r) => r.createdAt },
            ]}
          />
        }
      />
      <Toolbar>
        <Segmented
          label="Segment"
          value={(params.segment as string) ?? 'all'}
          onChange={(v) => t.setFilter('segment', v)}
          options={[
            { value: 'all', label: 'All', count: c?.all },
            { value: 'new', label: 'New (30d)', count: c?.new },
            { value: 'repeat', label: 'Repeat' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone…" className="sm:w-64" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <CitySelect value={params.city ?? ''} onChange={(e) => t.setFilter('city', e.target.value)} containerClassName="sm:w-36" />
          <Select
            aria-label="Status"
            compact
            placeholder="Any status"
            value={params.status ?? ''}
            onChange={(e) => t.setFilter('status', e.target.value)}
            options={[
              { value: 'active', label: `Active (${c?.active ?? 0})` },
              { value: 'blocked', label: `Blocked (${c?.blocked ?? 0})` },
            ]}
            containerClassName="sm:w-36"
          />
        </div>
        <ClearFilters show={!!(params.city || params.status || params.search || params.segment)} onClear={() => (setSearch(''), t.reset())} />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Customers"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(r) => r.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          onRowClick={(r) => navigate(to(`/customers/${r.id}`))}
          empty={<EmptyState icon={Users} title="No customers found" description="Adjust the filters or search." />}
          columns={[
            { key: 'name', header: 'Customer', sortKey: 'name', mobile: 'title', cell: (r) => <PersonCell name={r.name} sub={r.email} src={r.avatar} /> },
            { key: 'phone', header: 'Phone', hideBelow: 'xl', mobile: false, cell: (r) => <span className="whitespace-nowrap">{r.phone}</span> },
            { key: 'city', header: 'City', hideBelow: 'lg', cell: (r) => r.city },
            { key: 'bookings', header: 'Bookings', sortKey: 'bookings', align: 'right', cell: (r) => <span className="tabular">{r.bookingsCount}</span> },
            { key: 'spent', header: 'Spent', sortKey: 'spent', align: 'right', cell: (r) => <span className="font-semibold tabular text-ink">{formatMoney(r.totalSpent)}</span> },
            { key: 'wallet', header: 'Wallet', sortKey: 'wallet', align: 'right', hideBelow: 'lg', cell: (r) => <span className="tabular">{formatMoney(r.walletBalance)}</span> },
            { key: 'active', header: 'Last active', sortKey: 'active', hideBelow: 'xl', cell: (r) => timeAgo(r.lastActiveAt) },
            { key: 'joined', header: 'Joined', sortKey: 'joined', hideBelow: 'lg', cell: (r) => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span> },
            { key: 'status', header: 'Status', mobile: 'aside', cell: (r) => <StatusBadge map={ACCOUNT_STATUS} value={r.status} size="xs" /> },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
    </>
  );
}
