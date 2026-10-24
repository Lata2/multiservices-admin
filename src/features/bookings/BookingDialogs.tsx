import { useState } from 'react';
import { Ban, CalendarClock, RefreshCw, Undo2 } from 'lucide-react';
import { Button, Checkbox, ConfirmDialog, Dialog, Input, Select, Textarea } from '@/components/ui';
import { useLookups } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { formatMoney, formatTime, todayKey } from '@/lib/format';
import { BOOKING_STATUS, CANCEL_REASONS, STATUS_FLOW } from '@/lib/status';
import { bookingsApi } from '@/services/api';
import type { Booking, BookingStatus } from '@/types/models';

const invalidate = (id: string) => [qk.bookings.all, qk.dashboard.admin, qk.finance.all, qk.bookings.detail(id)];
type DialogProps = { booking: Booking; open: boolean; onClose: () => void };

export function StatusDialog({ booking, open, onClose }: DialogProps) {
  const options = STATUS_FLOW[booking.status].filter((s) => s !== 'cancelled');
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [note, setNote] = useState('');
  const m = useApiMutation(() => bookingsApi.updateStatus(booking.id, status as BookingStatus, note), {
    invalidate: invalidate(booking.id),
    success: () => `Booking moved to ${BOOKING_STATUS[status as BookingStatus].label.toLowerCase()}`,
    onSuccess: onClose,
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Update status"
      description={`Currently ${BOOKING_STATUS[booking.status].label.toLowerCase()}. Customer and provider are notified.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" disabled={!status} loading={m.isPending} onClick={() => m.mutate()}>
            Update status
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`focus-ring rounded-xl border p-3 text-left transition-colors ${status === s ? 'border-panel bg-panel-soft' : 'border-line hover:border-line-strong'}`}
            >
              <span className="block font-semibold text-ink">{BOOKING_STATUS[s].label}</span>
              <span className="text-xs text-ink-3">{s === 'rejected' ? 'Provider can’t take it; refunds if paid' : s === 'completed' ? 'Marks cash bookings as paid' : 'Next step in the job flow'}</span>
            </button>
          ))}
        </div>
        <Textarea label="Note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible in the booking timeline" />
      </div>
    </Dialog>
  );
}

export function CancelDialog({ booking, open, onClose }: DialogProps) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [other, setOther] = useState('');
  const paid = booking.payment.status === 'paid' || booking.payment.status === 'partially_refunded';
  const [refund, setRefund] = useState(paid);
  const finalReason = reason === 'Other' ? other : reason;
  const m = useApiMutation(() => bookingsApi.cancel(booking.id, finalReason, refund), { invalidate: invalidate(booking.id), success: refund && paid ? 'Booking cancelled and refunded' : 'Booking cancelled', onSuccess: onClose });
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => m.mutate()}
      loading={m.isPending}
      tone="danger"
      icon={Ban}
      title="Cancel booking"
      confirmLabel="Cancel booking"
      confirmDisabled={finalReason.trim().length < 3}
      message={`#${booking.code} for ${booking.customerName}. Both parties are notified.`}
    >
      <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))} />
      {reason === 'Other' ? <Input label="Describe the reason" value={other} onChange={(e) => setOther(e.target.value)} autoFocus /> : null}
      {paid ? (
        <Checkbox checked={refund} onChange={setRefund}>
          <span className="text-sm text-ink-2">Refund {formatMoney(booking.pricing.total - (booking.payment.refundedAmount ?? 0))} to the original payment method</span>
        </Checkbox>
      ) : null}
    </ConfirmDialog>
  );
}

export function RefundDialog({ booking, open, onClose }: DialogProps) {
  const max = booking.pricing.total - (booking.payment.refundedAmount ?? 0);
  const [amount, setAmount] = useState(String(max));
  const [reason, setReason] = useState('');
  const n = Number(amount);
  const err = !n || n <= 0 ? 'Enter an amount' : n > max ? `Maximum refundable is ${formatMoney(max)}` : undefined;
  const m = useApiMutation(() => bookingsApi.refund(booking.id, n, reason), { invalidate: invalidate(booking.id), success: `Refunded ${formatMoney(n)}`, onSuccess: onClose });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Issue refund"
      description={`Paid by ${booking.payment.method.toUpperCase()}. Refunds go back to the original method.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" icon={Undo2} disabled={!!err || reason.trim().length < 3} loading={m.isPending} onClick={() => m.mutate()}>
            Refund {n > 0 && !err ? formatMoney(n) : ''}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {[0.25, 0.5, 1].map((f) => (
            <Button key={f} size="xs" variant="subtle" onClick={() => setAmount(String(Math.round(max * f)))}>
              {f === 1 ? 'Full' : `${f * 100}%`}
            </Button>
          ))}
        </div>
        <Input label="Amount" prefixText="₹" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} error={amount ? err : undefined} hint={`Up to ${formatMoney(max)}`} />
        <Textarea label="Reason" required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Service partially completed" />
      </div>
    </Dialog>
  );
}

export function ReassignDialog({ booking, open, onClose }: DialogProps) {
  const lookups = useLookups();
  const candidates = (lookups.data?.providers ?? []).filter((p) => p.status === 'approved' && p.city === booking.city && p.categoryIds.includes(booking.categoryId) && p.id !== booking.providerId);
  const [providerId, setProviderId] = useState('');
  const [note, setNote] = useState('');
  const m = useApiMutation(() => bookingsApi.reassign(booking.id, providerId, note), { invalidate: [...invalidate(booking.id), qk.providers.all], success: 'Booking reassigned', onSuccess: onClose });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Reassign provider"
      description={`Approved providers in ${booking.city} offering this category.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" icon={RefreshCw} disabled={!providerId} loading={m.isPending} onClick={() => m.mutate()}>
            Reassign
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {candidates.length ? (
          <Select label="New provider" placeholder="Choose a provider" value={providerId} onChange={(e) => setProviderId(e.target.value)} options={candidates.map((p) => ({ value: p.id, label: p.name }))} />
        ) : (
          <p className="rounded-lg bg-surface-2 p-3 text-sm text-ink-2">No other approved provider in {booking.city} offers this category yet.</p>
        )}
        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it was moved" />
      </div>
    </Dialog>
  );
}

const SLOTS = Array.from({ length: 24 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

export function RescheduleDialog({ booking, open, onClose }: DialogProps) {
  const [date, setDate] = useState(booking.scheduledDate < todayKey() ? todayKey() : booking.scheduledDate);
  const [slot, setSlot] = useState(booking.slot);
  const m = useApiMutation(() => bookingsApi.reschedule(booking.id, date, slot), { invalidate: invalidate(booking.id), success: 'Booking rescheduled', onSuccess: onClose });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Reschedule"
      description={booking.rescheduleCount ? `Already rescheduled ${booking.rescheduleCount}×.` : 'Customer and provider get the new time.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" icon={CalendarClock} loading={m.isPending} disabled={!date || date < todayKey()} onClick={() => m.mutate()}>
            Save new time
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date" type="date" min={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
        <Select label="Time" value={slot} onChange={(e) => setSlot(e.target.value)} options={SLOTS.map((s) => ({ value: s, label: formatTime(s) }))} />
      </div>
    </Dialog>
  );
}
