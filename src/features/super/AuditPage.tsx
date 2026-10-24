import { FileClock } from 'lucide-react';
import { ClearFilters, ExportButton, TablePager } from '@/components/domain/ListKit';
import { Avatar, Badge, DataTable, EmptyState, ErrorState, PageHeader, SearchInput, Select, StatusBadge, Toolbar } from '@/components/ui';
import { useAuditLogs, useLookups } from '@/hooks/queries';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { fetchAll } from '@/lib/fetchAll';
import { formatDateTime, timeAgo } from '@/lib/format';
import { SEVERITY } from '@/lib/status';
import { platformApi } from '@/services/api';
import type { AuditFilters } from '@/services/api/platform.api';

type F = { severity?: string; actorId?: string; entity?: string; days?: string };
const ENTITIES = ['Booking', 'Provider', 'Customer', 'DeliveryPartner', 'DeliveryTask', 'Payout', 'PromoCode', 'Banner', 'Broadcast', 'Review', 'Ticket', 'Category', 'Service', 'Settings', 'Role', 'Admin', 'City', 'FeatureFlag', 'AppVersion', 'CmsPage', 'Faq', 'Session'];

export default function AuditPage() {
  const t = useTableState<F>({ pageSize: 20, sort: 'at', dir: 'desc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const filters = { ...params, days: params.days ? Number(params.days) : undefined } as unknown as AuditFilters;
  const q = useAuditLogs(filters);
  const admins = useLookups().data?.admins ?? [];
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change made in the console, who made it and from where. Entries can’t be edited."
        actions={
          <ExportButton
            filename="audit-log"
            load={() => fetchAll(platformApi.audit, filters)}
            columns={[
              { header: 'Time', value: (l) => l.at },
              { header: 'Admin', value: (l) => l.actorName },
              { header: 'Role', value: (l) => l.actorRole },
              { header: 'Action', value: (l) => l.action },
              { header: 'Entity', value: (l) => l.entity },
              { header: 'Reference', value: (l) => l.entityId },
              { header: 'Summary', value: (l) => l.summary },
              { header: 'Severity', value: (l) => l.severity },
              { header: 'IP', value: (l) => l.ip },
            ]}
          />
        }
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search action, summary, IP…" className="sm:w-64" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select aria-label="Admin" compact placeholder="All admins" value={params.actorId ?? ''} onChange={(e) => t.setFilter('actorId', e.target.value)} options={admins.map((a) => ({ value: a.id, label: a.name }))} containerClassName="sm:w-44" />
          <Select aria-label="Entity" compact placeholder="All records" value={params.entity ?? ''} onChange={(e) => t.setFilter('entity', e.target.value)} options={ENTITIES.map((e) => ({ value: e, label: e.replace(/([a-z])([A-Z])/g, '$1 $2') }))} containerClassName="sm:w-40" />
          <Select aria-label="Severity" compact placeholder="Any severity" value={params.severity ?? ''} onChange={(e) => t.setFilter('severity', e.target.value)} options={[{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'critical', label: 'Critical' }]} containerClassName="sm:w-36" />
          <Select aria-label="Period" compact placeholder="All time" value={params.days ?? ''} onChange={(e) => t.setFilter('days', e.target.value)} options={[{ value: '1', label: 'Last 24 hours' }, { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }]} containerClassName="sm:w-36" />
        </div>
        <ClearFilters show={!!(params.actorId || params.entity || params.severity || params.days || params.search)} onClear={() => (setSearch(''), t.reset())} />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Audit log"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(l) => l.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          dense
          empty={<EmptyState icon={FileClock} title="No activity matches" />}
          columns={[
            { key: 'at', header: 'When', sortKey: 'at', mobile: 'aside', cell: (l) => <span className="whitespace-nowrap text-sm" title={formatDateTime(l.at)}>{timeAgo(l.at)}</span> },
            { key: 'actor', header: 'Admin', sortKey: 'actor', mobile: 'title', cell: (l) => <span className="flex items-center gap-2"><Avatar name={l.actorName} size="xs" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{l.actorName}</span><span className="block truncate text-2xs text-ink-3">{l.actorRole}</span></span></span> },
            { key: 'summary', header: 'What happened', cell: (l) => <span className="block max-w-md text-sm text-ink">{l.summary}</span> },
            { key: 'action', header: 'Action', hideBelow: 'xl', cell: (l) => <code className="text-xs text-ink-2">{l.action}</code> },
            { key: 'entity', header: 'Record', hideBelow: 'lg', cell: (l) => <Badge size="xs">{l.entity}</Badge> },
            { key: 'sev', header: 'Severity', cell: (l) => <StatusBadge map={SEVERITY} value={l.severity} size="xs" /> },
            { key: 'ip', header: 'IP', hideBelow: 'xl', cell: (l) => <code className="text-xs text-ink-3">{l.ip}</code> },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
    </>
  );
}
