import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Ban, CalendarClock, ChevronDown, MapPin, PackageCheck, Phone, Printer, RefreshCw, Send, Store, Undo2, User } from 'lucide-react';
import { BookingTimeline, PriceSummary } from '@/components/domain';
import { Badge, Button, Card, CardHeader, ErrorState, KeyValue, Menu, PageHeader, PageLoader, StatusBadge, Textarea } from '@/components/ui';
import { useBooking } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useCan, usePanel } from '@/hooks/useAccess';
import { formatDateTime, formatDay, formatMoney, formatTime } from '@/lib/format';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, STATUS_FLOW } from '@/lib/status';
import { bookingsApi } from '@/services/api';
import type { Booking } from '@/types/models';
import { CancelDialog, ReassignDialog, RefundDialog, RescheduleDialog, StatusDialog } from './BookingDialogs';

type Open = null | 'status' | 'cancel' | 'refund' | 'reassign' | 'reschedule';

export default function BookingDetailPage() {
  const { id = '' } = useParams();
  const q = useBooking(id);
  const { to } = usePanel();
  if (q.isPending) return <PageLoader />;
  if (q.isError)
    return (
      <>
        <PageHeader title="Booking" back={to('/bookings')} />
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </>
    );
  return <Detail b={q.data} />;
}

function Detail({ b }: { b: Booking }) {
  const can = useCan();
  const { to } = usePanel();
  const [open, setOpen] = useState<Open>(null);
  const [note, setNote] = useState('');
  const addNote = useApiMutation(() => bookingsApi.addNote(b.id, note), { invalidate: [qk.bookings.detail(b.id)], success: 'Note added', onSuccess: () => setNote('') });

  const manage = can('bookings.manage');
  const next = STATUS_FLOW[b.status].filter((s) => s !== 'cancelled');
  const cancellable = STATUS_FLOW[b.status].includes('cancelled');
  const refundable = can('payments.refund') && (b.payment.status === 'paid' || b.payment.status === 'partially_refunded');
  const upcoming = b.status === 'pending' || b.status === 'confirmed';
  const close = () => setOpen(null);

  return (
    <>
      <PageHeader
        back={to('/bookings')}
        breadcrumbs={[{ label: 'Bookings', to: to('/bookings') }, { label: `#${b.code}` }]}
        title={`#${b.code}`}
        meta={<StatusBadge map={BOOKING_STATUS} value={b.status} />}
        description={`Placed ${formatDateTime(b.createdAt)} in ${b.city}`}
        actions={
          <>
            <Button variant="ghost" size="sm" icon={Printer} onClick={() => window.print()} className="no-print max-sm:hidden">
              Print
            </Button>
            {refundable ? (
              <Button variant="outline" size="sm" icon={Undo2} onClick={() => setOpen('refund')}>
                Refund
              </Button>
            ) : null}
            {manage && (next.length || cancellable || upcoming) ? (
              <Menu
                label="Booking actions"
                trigger={(p) => (
                  <Button variant="panel" size="sm" iconRight={ChevronDown} {...p}>
                    Manage
                  </Button>
                )}
                items={[
                  { label: 'Update status', icon: RefreshCw, onSelect: () => setOpen('status'), hidden: !next.length },
                  { label: 'Reassign provider', icon: Store, onSelect: () => setOpen('reassign'), hidden: !upcoming },
                  { label: 'Reschedule', icon: CalendarClock, onSelect: () => setOpen('reschedule'), hidden: !upcoming },
                  { label: 'Cancel booking', icon: Ban, tone: 'danger', onSelect: () => setOpen('cancel'), hidden: !cancellable },
                ]}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-3">Scheduled</p>
                <p className="mt-0.5 font-semibold text-ink">{formatDay(b.scheduledDate)}</p>
                <p className="text-sm text-ink-2">{formatTime(b.slot)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-3">Payment</p>
                <p className="mt-0.5 font-semibold text-ink">{PAYMENT_METHOD[b.payment.method]}</p>
                <StatusBadge map={PAYMENT_STATUS} value={b.payment.status} size="xs" />
              </div>
              <div>
                <p className="text-xs text-ink-3">Total</p>
                <p className="mt-0.5 text-xl font-bold tabular text-ink">{formatMoney(b.pricing.total)}</p>
                {b.rescheduleCount ? <p className="text-xs text-ink-3">Rescheduled {b.rescheduleCount}×</p> : null}
              </div>
            </div>
            {b.cancelReason ? <p className="mt-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-500/10 dark:text-danger-400">Reason: {b.cancelReason}</p> : null}
          </Card>

          <Card>
            <CardHeader title="Services" subtitle={`${b.items.length} item${b.items.length > 1 ? 's' : ''}`} />
            <ul className="divide-y divide-line">
              {b.items.map((it) => (
                <li key={it.serviceId} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{it.title}</span>
                    <span className="text-xs text-ink-3">
                      {formatMoney(it.unitPrice)} × {it.quantity}
                    </span>
                  </span>
                  <span className="font-semibold tabular text-ink">{formatMoney(it.unitPrice * it.quantity)}</span>
                </li>
              ))}
            </ul>
            {b.notes ? <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-ink-2">Customer note: {b.notes}</p> : null}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader title="Customer" />
              <Party icon={User} name={b.customerName} sub={b.customerPhone} link={can('customers.view') ? to(`/customers/${b.customerId}`) : undefined} />
              <p className="mt-3 flex gap-2 text-sm text-ink-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-3" />
                <span>
                  <Badge size="xs" className="mr-1.5">
                    {b.address.label}
                  </Badge>
                  {b.address.line1}, {b.address.line2}, {b.address.city} {b.address.pincode}
                </span>
              </p>
            </Card>
            <Card>
              <CardHeader title="Provider" />
              <Party icon={Store} name={b.providerName} sub="Assigned professional" link={can('providers.view') ? to(`/providers/${b.providerId}`) : undefined} />
              {b.deliveryTaskId && can('deliveries.view') ? (
                <Link to={to(`/dispatch?q=${b.code}`)} className="focus-ring mt-3 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-ink-2 hover:text-ink">
                  <PackageCheck size={15} /> Includes pickup & drop — view in Dispatch
                </Link>
              ) : null}
            </Card>
          </div>

          <Card>
            <CardHeader title="Activity" subtitle="Status changes, refunds and internal notes" />
            {manage || can('support.manage') ? (
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end">
                <Textarea aria-label="Internal note" rows={1} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note (not visible to customer)" containerClassName="flex-1" />
                <Button icon={Send} variant="soft" disabled={note.trim().length < 2} loading={addNote.isPending} onClick={() => addNote.mutate()}>
                  Add note
                </Button>
              </div>
            ) : null}
            <BookingTimeline events={b.timeline} />
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Price breakdown" />
            <PriceSummary pricing={b.pricing} promoCode={b.promoCode} refunded={b.payment.refundedAmount} />
          </Card>
          <Card>
            <CardHeader title="Payment details" />
            <dl className="divide-y divide-line">
              <KeyValue label="Method" value={PAYMENT_METHOD[b.payment.method]} />
              <KeyValue label="Status" value={<StatusBadge map={PAYMENT_STATUS} value={b.payment.status} size="xs" />} />
              {b.payment.transactionId ? <KeyValue label="Transaction" value={<code className="text-sm">{b.payment.transactionId}</code>} /> : null}
              {b.rating ? <KeyValue label="Customer rating" value={`${b.rating} ★`} /> : null}
            </dl>
          </Card>
        </aside>
      </div>

      {open === 'status' ? <StatusDialog booking={b} open onClose={close} /> : null}
      {open === 'cancel' ? <CancelDialog booking={b} open onClose={close} /> : null}
      {open === 'refund' ? <RefundDialog booking={b} open onClose={close} /> : null}
      {open === 'reassign' ? <ReassignDialog booking={b} open onClose={close} /> : null}
      {open === 'reschedule' ? <RescheduleDialog booking={b} open onClose={close} /> : null}
    </>
  );
}

function Party({ icon: I, name, sub, link }: { icon: typeof User; name: string; sub: string; link?: string }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-panel-soft text-panel-ink">
        <I size={18} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{name}</span>
        <span className="flex items-center gap-1 text-sm text-ink-3">
          {sub.startsWith('+') ? <Phone size={12} /> : null}
          {sub}
        </span>
      </span>
    </>
  );
  return link ? (
    <Link to={link} className="focus-ring -m-2 flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
      {inner}
    </Link>
  ) : (
    <div className="flex items-center gap-3">{inner}</div>
  );
}
