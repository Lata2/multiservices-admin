import { useNavigate } from 'react-router';
import { BadgeCheck, Star, Store } from 'lucide-react';
import { CategorySelect, CitySelect } from '@/components/domain';
import { ClearFilters, ExportButton, TablePager } from '@/components/domain/ListKit';
import { Badge, DataTable, EmptyState, ErrorState, PageHeader, PersonCell, SearchInput, Select, StatusBadge, Tabs, Toolbar } from '@/components/ui';
import { useLookups, useProviders } from '@/hooks/queries';
import { usePanel } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { fetchAll } from '@/lib/fetchAll';
import { formatDate, formatNumber } from '@/lib/format';
import { PROVIDER_STATUS } from '@/lib/status';
import { providersApi } from '@/services/api';
import type { ProviderFilters } from '@/services/api/providers.api';

type F = { status?: string; city?: string; categoryId?: string; type?: string };

export default function ProvidersPage() {
  const t = useTableState<F>({ sort: 'joined', dir: 'desc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const filters = params as unknown as ProviderFilters;
  const q = useProviders(filters);
  const cats = useLookups().data?.categories ?? [];
  const navigate = useNavigate();
  const { to } = usePanel();
  const c = q.data?.counts;
  const catName = (id: string) => cats.find((x) => x.id === id)?.name ?? id;

  return (
    <>
      <PageHeader
        title="Providers"
        description="Service professionals and businesses — KYC, approvals and commission."
        actions={
          <ExportButton
            filename="providers"
            load={() => fetchAll(providersApi.list, filters)}
            columns={[
              { header: 'Business', value: (p) => p.businessName },
              { header: 'Owner', value: (p) => p.ownerName },
              { header: 'Type', value: (p) => p.type },
              { header: 'City', value: (p) => p.city },
              { header: 'Categories', value: (p) => p.categoryIds.map(catName).join('; ') },
              { header: 'Rating', value: (p) => p.rating },
              { header: 'Jobs', value: (p) => p.jobsCompleted },
              { header: 'Commission %', value: (p) => p.commissionRate },
              { header: 'Status', value: (p) => p.status },
            ]}
          />
        }
      />
      <Tabs
        label="Provider status"
        className="mb-4"
        value={params.status ?? 'all'}
        onChange={(v) => t.setFilter('status', v)}
        tabs={[
          { value: 'all', label: 'All', count: c?.all },
          { value: 'pending', label: 'Pending review', count: c?.pending },
          { value: 'approved', label: 'Approved', count: c?.approved },
          { value: 'suspended', label: 'Suspended', count: c?.suspended },
          { value: 'rejected', label: 'Rejected', count: c?.rejected },
        ]}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search business, owner, phone…" className="sm:w-64" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <CitySelect value={params.city ?? ''} onChange={(e) => t.setFilter('city', e.target.value)} containerClassName="sm:w-36" />
          <CategorySelect value={params.categoryId ?? ''} onChange={(e) => t.setFilter('categoryId', e.target.value)} containerClassName="sm:w-44" />
          <Select aria-label="Type" compact placeholder="Any type" value={params.type ?? ''} onChange={(e) => t.setFilter('type', e.target.value)} options={[{ value: 'individual', label: 'Individual' }, { value: 'organization', label: 'Organisation' }]} containerClassName="sm:w-36" />
        </div>
        <ClearFilters show={!!(params.city || params.categoryId || params.type || params.search)} onClear={() => (setSearch(''), t.reset())} />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Providers"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(r) => r.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          onRowClick={(r) => navigate(to(`/providers/${r.id}`))}
          empty={<EmptyState icon={Store} title="No providers here" description={params.status === 'pending' ? 'No applications waiting for review.' : 'Adjust the filters or search.'} />}
          columns={[
            {
              key: 'name',
              header: 'Provider',
              sortKey: 'name',
              mobile: 'title',
              cell: (p) => (
                <span className="flex items-center gap-1.5">
                  <PersonCell name={p.businessName} sub={`${p.ownerName}, ${p.type === 'organization' ? 'organisation' : 'individual'}`} src={p.avatar} square />
                  {p.verified ? <BadgeCheck size={15} className="shrink-0 text-primary-500" aria-label="Verified" /> : null}
                </span>
              ),
            },
            {
              key: 'cats',
              header: 'Categories',
              hideBelow: 'xl',
              cell: (p) => (
                <span className="flex flex-wrap gap-1">
                  {p.categoryIds.slice(0, 2).map((id) => (
                    <Badge key={id} size="xs">
                      {catName(id)}
                    </Badge>
                  ))}
                </span>
              ),
            },
            { key: 'city', header: 'City', hideBelow: 'lg', cell: (p) => p.city },
            { key: 'rating', header: 'Rating', sortKey: 'rating', align: 'right', cell: (p) => (p.rating ? <span className="inline-flex items-center gap-1 tabular"><Star size={13} className="fill-warning-400 text-warning-400" />{p.rating.toFixed(1)}</span> : <span className="text-ink-3">New</span>) },
            { key: 'jobs', header: 'Jobs', sortKey: 'jobs', align: 'right', hideBelow: 'lg', cell: (p) => <span className="tabular">{formatNumber(p.jobsCompleted)}</span> },
            { key: 'commission', header: 'Commission', sortKey: 'commission', align: 'right', hideBelow: 'lg', cell: (p) => <span className="tabular">{p.commissionRate}%</span> },
            { key: 'joined', header: 'Joined', sortKey: 'joined', hideBelow: 'xl', cell: (p) => formatDate(p.joinedAt) },
            { key: 'status', header: 'Status', mobile: 'aside', cell: (p) => <StatusBadge map={PROVIDER_STATUS} value={p.status} size="xs" /> },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
    </>
  );
}
