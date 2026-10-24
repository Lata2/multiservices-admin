import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Inbox, LifeBuoy, Lock, Send } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Pagination, SearchInput, Select, Skeleton, StatusBadge, Switch, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/ui';
import { useLookups, useTicket, useTickets } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useAdmin, useCan, usePanel } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { cn } from '@/lib/cn';
import { formatDateTime, timeAgo, titleCase } from '@/lib/format';
import { TICKET_PRIORITY, TICKET_STATUS } from '@/lib/status';
import { engagementApi } from '@/services/api';
import type { TicketFilters } from '@/services/api/engagement.api';
import type { SupportTicket, TicketPriority, TicketStatus } from '@/types/models';

type F = { status?: string; priority?: string; role?: string };

export default function SupportPage() {
  const { id } = useParams();
  const t = useTableState<F>({ pageSize: 12 });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const q = useTickets(params as unknown as TicketFilters);
  const { to } = usePanel();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const c = q.data?.counts;
  const qs = sp.toString() ? `?${sp.toString()}` : '';

  return (
    <>
      <div className={cn(id && 'max-lg:hidden')}>
        <PageHeader title="Support desk" description="Tickets from customers, providers and delivery partners." />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <section aria-label="Tickets" className={cn('min-w-0', id && 'max-lg:hidden')}>
          <Tabs
            label="Ticket status"
            className="mb-3"
            value={params.status ?? 'all'}
            onChange={(v) => t.setFilter('status', v)}
            tabs={[
              { value: 'all', label: 'All', count: c?.all },
              { value: 'mine', label: 'Mine', count: c?.mine },
              { value: 'open', label: 'Open', count: c?.open },
              { value: 'in_progress', label: 'In progress', count: c?.in_progress },
              { value: 'resolved', label: 'Resolved', count: c?.resolved },
            ]}
          />
          <div className="mb-3 flex flex-col gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search subject, number, name…" />
            <div className="grid grid-cols-2 gap-2">
              <Select aria-label="Priority" compact placeholder="Any priority" value={params.priority ?? ''} onChange={(e) => t.setFilter('priority', e.target.value)} options={(Object.keys(TICKET_PRIORITY) as TicketPriority[]).map((p) => ({ value: p, label: TICKET_PRIORITY[p].label }))} />
              <Select aria-label="From" compact placeholder="Everyone" value={params.role ?? ''} onChange={(e) => t.setFilter('role', e.target.value)} options={[{ value: 'customer', label: 'Customers' }, { value: 'provider', label: 'Providers' }, { value: 'delivery', label: 'Delivery partners' }]} />
            </div>
          </div>
          <Card padded={false} className="overflow-hidden">
            {q.isError ? (
              <ErrorState error={q.error} onRetry={() => void q.refetch()} />
            ) : q.isPending ? (
              <div className="flex flex-col gap-3 p-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : q.data.items.length ? (
              <ul className="divide-y divide-line">
                {q.data.items.map((tk) => (
                  <li key={tk.id}>
                    <button
                      type="button"
                      onClick={() => navigate(to(`/support/${tk.id}`) + qs)}
                      aria-current={tk.id === id ? 'true' : undefined}
                      className={cn('flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none', tk.id === id && 'bg-panel-soft hover:bg-panel-soft')}
                    >
                      <Avatar name={tk.userName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-ink">{tk.subject}</span>
                          <span className="shrink-0 text-xs text-ink-3">{timeAgo(tk.updatedAt)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-3">
                          {tk.number}, {tk.userName} ({tk.userRole})
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          <StatusBadge map={TICKET_STATUS} value={tk.status} size="xs" />
                          <StatusBadge map={TICKET_PRIORITY} value={tk.priority} size="xs" />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={Inbox} title="No tickets" description="Nothing matches these filters." />
            )}
            {q.data ? <Pagination page={q.data.page} pageCount={q.data.pageCount} total={q.data.total} pageSize={q.data.pageSize} onPage={t.setPage} /> : null}
          </Card>
        </section>
        <section aria-label="Ticket" className={cn('min-w-0 lg:sticky lg:top-22 lg:self-start', !id && 'max-lg:hidden')}>
          {id ? (
            <TicketView id={id} backTo={to('/support') + qs} />
          ) : (
            <Card className="flex h-full min-h-80 items-center justify-center">
              <EmptyState icon={LifeBuoy} title="Pick a ticket" description="Select a conversation to read and reply." />
            </Card>
          )}
        </section>
      </div>
    </>
  );
}

const QUICK = ['Thanks for reaching out — we’re looking into this now.', 'Your refund has been initiated and will reflect in 3–5 business days.', 'Could you share a photo or screenshot so we can check?'];

function TicketView({ id, backTo }: { id: string; backTo: string }) {
  const q = useTicket(id);
  const can = useCan();
  const me = useAdmin();
  const { to } = usePanel();
  const admins = useLookups().data?.admins ?? [];
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inv = [qk.tickets.all, qk.dashboard.admin];
  const reply = useApiMutation(() => engagementApi.reply(id, text, internal), { invalidate: inv, success: internal ? 'Internal note added' : 'Reply sent', onSuccess: () => setText('') });
  const update = useApiMutation((patch: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null }) => engagementApi.updateTicket(id, patch), { invalidate: inv, success: 'Ticket updated' });
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [q.data?.messages.length]);

  if (q.isPending) return <Skeleton className="h-[520px]" />;
  if (q.isError) return <Card><ErrorState error={q.error} onRetry={() => void q.refetch()} /></Card>;
  const tk: SupportTicket = q.data;
  const manage = can('support.manage');
  return (
    <Card padded={false} className="flex min-h-[560px] flex-col">
      <div className="border-b border-line p-4 sm:p-5">
        <Link to={backTo} className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-ink-3 hover:text-ink lg:hidden">
          <ArrowLeft size={15} /> All tickets
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink">{tk.subject}</h2>
            <p className="mt-0.5 text-sm text-ink-3">
              {tk.number} opened {timeAgo(tk.createdAt)} by {tk.userName} <Badge size="xs">{titleCase(tk.userRole)}</Badge>
              {tk.bookingId && can('bookings.view') ? (
                <Link to={to(`/bookings/${tk.bookingId}`)} className="ml-2 font-semibold text-panel-ink hover:underline">
                  View booking
                </Link>
              ) : null}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select label="Status" compact disabled={!manage} value={tk.status} onChange={(e) => update.mutate({ status: e.target.value as TicketStatus })} options={(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => ({ value: s, label: TICKET_STATUS[s].label }))} />
          <Select label="Priority" compact disabled={!manage} value={tk.priority} onChange={(e) => update.mutate({ priority: e.target.value as TicketPriority })} options={(Object.keys(TICKET_PRIORITY) as TicketPriority[]).map((s) => ({ value: s, label: TICKET_PRIORITY[s].label }))} />
          <Select label="Assignee" compact disabled={!manage} value={tk.assigneeId ?? ''} placeholder="Unassigned" onChange={(e) => update.mutate({ assigneeId: e.target.value || null })} options={admins.map((a) => ({ value: a.id, label: a.id === me?.id ? `${a.name} (you)` : a.name }))} />
        </div>
      </div>
      <ol className="flex flex-1 flex-col gap-3 overflow-y-auto bg-surface-2/50 p-4 sm:p-5">
        {tk.messages.map((m) => {
          const mine = m.from !== 'user';
          return (
            <li key={m.id} className={cn('flex max-w-[85%] flex-col gap-1', mine ? 'items-end self-end' : 'items-start')}>
              <div
                className={cn(
                  'rounded-2xl px-3.5 py-2.5 text-sm [overflow-wrap:anywhere]',
                  m.from === 'user' && 'rounded-tl-md bg-surface text-ink shadow-xs',
                  m.from === 'support' && 'panel-gradient rounded-tr-md text-white',
                  m.from === 'internal' && 'rounded-tr-md border border-dashed border-warning-400 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
                )}
              >
                {m.from === 'internal' ? (
                  <span className="mb-1 flex items-center gap-1 text-xs font-semibold">
                    <Lock size={11} /> Internal note
                  </span>
                ) : null}
                {m.text}
              </div>
              <span className="px-1 text-2xs text-ink-3">
                {m.authorName}, {formatDateTime(m.at)}
              </span>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>
      {manage && tk.status !== 'closed' ? (
        <div className="border-t border-line p-3 sm:p-4">
          <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK.map((qr) => (
              <button key={qr} type="button" onClick={() => setText(qr)} className="focus-ring shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-line-strong hover:text-ink">
                {qr.slice(0, 34)}…
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim().length >= 2) reply.mutate();
            }}
            className={cn('rounded-xl border bg-surface transition-colors focus-within:ring-3', internal ? 'border-warning-400 focus-within:ring-warning-500/15' : 'border-line focus-within:border-primary-400 focus-within:ring-primary-500/15')}
          >
            <textarea
              aria-label={internal ? 'Internal note' : 'Reply'}
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim().length >= 2) reply.mutate();
              }}
              placeholder={internal ? 'Only admins can see this note…' : `Reply to ${tk.userName.split(' ')[0]}…`}
              className="block w-full resize-none bg-transparent px-3.5 pt-3 text-base outline-none placeholder:text-ink-3"
            />
            <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
              <label className="flex items-center gap-2 text-xs font-medium text-ink-2">
                <Switch size="sm" checked={internal} onChange={setInternal} label="Internal note" /> Internal note
              </label>
              <Button type="submit" size="sm" variant={internal ? 'subtle' : 'panel'} icon={Send} disabled={text.trim().length < 2} loading={reply.isPending}>
                {internal ? 'Add note' : 'Send'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </Card>
  );
}
