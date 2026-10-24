import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Ban, Mail, MapPin, Phone, ShieldCheck, Wallet } from 'lucide-react';
import { Avatar, Button, Card, ConfirmDialog, DataTable, Dialog, EmptyState, ErrorState, Input, MiniStat, PageHeader, PageLoader, Segmented, StatusBadge, Tabs, Textarea } from '@/components/ui';
import { useCustomer } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useCan, usePanel } from '@/hooks/useAccess';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, formatDay, formatMoney, timeAgo } from '@/lib/format';
import { ACCOUNT_STATUS, BOOKING_STATUS, TICKET_STATUS } from '@/lib/status';
import { customersApi } from '@/services/api';
import type { CustomerDetail } from '@/services/api/customers.api';

export default function CustomerDetailPage() {
  const { id = '' } = useParams();
  const q = useCustomer(id);
  const { to } = usePanel();
  if (q.isPending) return <PageLoader />;
  if (q.isError)
    return (
      <>
        <PageHeader title="Customer" back={to('/customers')} />
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </>
    );
  return <Detail d={q.data} />;
}

function Detail({ d }: { d: CustomerDetail }) {
  const { customer: c, stats } = d;
  const can = useCan();
  const { to } = usePanel();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'bookings' | 'wallet' | 'tickets'>('bookings');
  const [blockOpen, setBlockOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [reason, setReason] = useState('');
  const blocked = c.status === 'blocked';
  const setStatus = useApiMutation(() => customersApi.setStatus(c.id, blocked ? 'active' : 'blocked', reason), {
    invalidate: [qk.customers.all],
    success: blocked ? 'Customer reactivated' : 'Customer blocked',
    onSuccess: () => (setBlockOpen(false), setReason('')),
  });

  return (
    <>
      <PageHeader
        back={to('/customers')}
        breadcrumbs={[{ label: 'Customers', to: to('/customers') }, { label: c.name }]}
        title={c.name}
        meta={<StatusBadge map={ACCOUNT_STATUS} value={c.status} />}
        actions={
          can('customers.manage') ? (
            <>
              <Button variant="outline" size="sm" icon={Wallet} onClick={() => setWalletOpen(true)}>
                Adjust wallet
              </Button>
              <Button variant={blocked ? 'success' : 'danger'} size="sm" icon={blocked ? ShieldCheck : Ban} onClick={() => setBlockOpen(true)}>
                {blocked ? 'Unblock' : 'Block'}
              </Button>
            </>
          ) : null
        }
      />
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <div className="flex flex-col items-center text-center">
            <Avatar name={c.name} src={c.avatar} size="xl" />
            <p className="mt-3 text-lg font-bold text-ink">{c.name}</p>
            <p className="text-sm text-ink-3">Customer since {formatDate(c.createdAt)}</p>
          </div>
          <ul className="mt-5 flex flex-col gap-2.5 text-sm text-ink-2">
            <li className="flex items-center gap-2.5">
              <Mail size={15} className="text-ink-3" />
              <a href={`mailto:${c.email}`} className="truncate hover:underline">{c.email}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={15} className="text-ink-3" />
              <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="hover:underline">{c.phone}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin size={15} className="text-ink-3" />
              {c.city}
            </li>
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <MiniStat label="Total spent" value={formatMoney(c.totalSpent)} />
            <MiniStat label="Wallet" value={formatMoney(c.walletBalance)} tone="success" />
            <MiniStat label="Completed" value={stats.completed} />
            <MiniStat label="Avg. order" value={formatMoney(stats.avgOrder)} />
          </div>
          <dl className="mt-4 flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-3">Favourite category</dt>
              <dd className="font-medium text-ink">{stats.favouriteCategory ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Referral code</dt>
              <dd className="font-medium text-ink">{c.referralCode ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Last active</dt>
              <dd className="font-medium text-ink">{timeAgo(c.lastActiveAt)}</dd>
            </div>
          </dl>
        </Card>

        <div className="min-w-0">
          <Tabs
            label="Customer records"
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'bookings', label: 'Bookings', count: d.bookings.length },
              { value: 'wallet', label: 'Wallet', count: d.wallet.length },
              { value: 'tickets', label: 'Tickets', count: d.tickets.length },
            ]}
          />
          {tab === 'bookings' ? (
            <DataTable
              caption="Customer bookings"
              data={d.bookings}
              rowKey={(b) => b.id}
              onRowClick={can('bookings.view') ? (b) => navigate(to(`/bookings/${b.id}`)) : undefined}
              empty={<EmptyState compact title="No bookings yet" />}
              columns={[
                { key: 'code', header: 'Booking', mobile: 'title', sortValue: (b) => b.code, cell: (b) => <span className="block"><span className="font-semibold text-ink">#{b.code}</span><span className="block max-w-56 truncate text-xs text-ink-3">{b.items[0].title}</span></span> },
                { key: 'provider', header: 'Provider', hideBelow: 'lg', cell: (b) => b.providerName },
                { key: 'date', header: 'Scheduled', sortValue: (b) => b.scheduledDate, cell: (b) => formatDay(b.scheduledDate) },
                { key: 'status', header: 'Status', mobile: 'aside', cell: (b) => <StatusBadge map={BOOKING_STATUS} value={b.status} size="xs" /> },
                { key: 'total', header: 'Total', align: 'right', sortValue: (b) => b.pricing.total, cell: (b) => <span className="font-semibold tabular">{formatMoney(b.pricing.total)}</span> },
              ]}
            />
          ) : tab === 'wallet' ? (
            <Card padded={false}>
              {d.wallet.length ? (
                <ul className="divide-y divide-line">
                  {d.wallet.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{w.title}</span>
                        <span className="text-xs text-ink-3">{formatDateTime(w.createdAt)}</span>
                      </span>
                      <span className={cn('font-semibold tabular', w.type === 'credit' ? 'text-success-600' : 'text-ink')}>
                        {w.type === 'credit' ? '+' : '−'}
                        {formatMoney(w.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={Wallet} title="No wallet activity" />
              )}
            </Card>
          ) : (
            <Card padded={false}>
              {d.tickets.length ? (
                <ul className="divide-y divide-line">
                  {d.tickets.map((t) => (
                    <li key={t.id}>
                      <Link to={to(`/support/${t.id}`)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{t.subject}</span>
                          <span className="text-xs text-ink-3">
                            {t.number}, {timeAgo(t.updatedAt)}
                          </span>
                        </span>
                        <StatusBadge map={TICKET_STATUS} value={t.status} size="xs" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact title="No support tickets" />
              )}
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        onConfirm={() => setStatus.mutate()}
        loading={setStatus.isPending}
        tone={blocked ? 'primary' : 'danger'}
        title={blocked ? 'Unblock customer?' : 'Block customer?'}
        confirmLabel={blocked ? 'Unblock' : 'Block customer'}
        confirmDisabled={!blocked && reason.trim().length < 3}
        message={blocked ? `${c.name} will be able to sign in and book again.` : `${c.name} won’t be able to sign in or book. Upcoming bookings stay as they are.`}
      >
        {!blocked ? <Textarea label="Reason" required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeated no-shows" /> : null}
      </ConfirmDialog>
      {walletOpen ? <WalletDialog id={c.id} balance={c.walletBalance} onClose={() => setWalletOpen(false)} /> : null}
    </>
  );
}

function WalletDialog({ id, balance, onClose }: { id: string; balance: number; onClose: () => void }) {
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const n = Number(amount);
  const err = amount && (n <= 0 || n > 10000) ? 'Between ₹1 and ₹10,000' : type === 'debit' && n > balance ? `Balance is ${formatMoney(balance)}` : undefined;
  const m = useApiMutation(() => customersApi.adjustWallet(id, type, n, reason), { invalidate: [qk.customers.all, qk.finance.all], success: `Wallet ${type === 'credit' ? 'credited' : 'debited'}`, onSuccess: onClose });
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Adjust wallet"
      description={`Current balance ${formatMoney(balance)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" disabled={!n || !!err || reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate()}>
            {type === 'credit' ? 'Add credit' : 'Deduct'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented label="Type" value={type} onChange={setType} options={[{ value: 'credit', label: 'Goodwill credit' }, { value: 'debit', label: 'Deduct' }]} />
        <Input label="Amount" prefixText="₹" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} error={err} />
        <Textarea label="Reason" required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Shown in the customer’s wallet history" />
      </div>
    </Dialog>
  );
}
