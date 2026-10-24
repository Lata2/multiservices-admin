import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { uid } from '@/mocks/helpers';
import { STATUS_FLOW, BOOKING_STATUS } from '@/lib/status';
import { formatMoney, todayKey } from '@/lib/format';
import type { ListParams, Paginated } from '@/types/admin';
import type { Booking, BookingStatus, PaymentMethod, PaymentStatus } from '@/types/models';
import { ApiError, http } from '../http';
import { assert, audit, inScope, mock, notFound, paginate, requirePerm, scopeCities } from '../mock/server';

export interface BookingFilters extends Partial<ListParams> {
  status?: BookingStatus | 'active' | 'all';
  city?: string;
  categoryId?: string;
  providerId?: string;
  customerId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  from?: string; // YYYY-MM-DD scheduled date
  to?: string;
}

export interface BookingCounts {
  all: number;
  active: number;
  pending: number;
  completed: number;
  cancelled: number;
  today: number;
}

export interface BookingsApi {
  list(f: BookingFilters): Promise<Paginated<Booking> & { counts: BookingCounts }>;
  get(id: string): Promise<Booking>;
  updateStatus(id: string, status: BookingStatus, note?: string): Promise<Booking>;
  cancel(id: string, reason: string, refund: boolean): Promise<Booking>;
  reassign(id: string, providerId: string, note?: string): Promise<Booking>;
  reschedule(id: string, date: string, slot: string): Promise<Booking>;
  refund(id: string, amount: number, reason: string): Promise<Booking>;
  addNote(id: string, note: string): Promise<Booking>;
}

export function filterBookings(f: BookingFilters) {
  const scope = scopeCities();
  return db.bookings.filter(
    (b) =>
      inScope(b.city, scope) &&
      (!f.status || f.status === 'all' || (f.status === 'active' ? ['pending', 'confirmed', 'on_the_way', 'in_progress'].includes(b.status) : f.status === 'cancelled' ? b.status === 'cancelled' || b.status === 'rejected' : b.status === f.status)) &&
      (!f.city || b.city === f.city) &&
      (!f.categoryId || b.categoryId === f.categoryId) &&
      (!f.providerId || b.providerId === f.providerId) &&
      (!f.customerId || b.customerId === f.customerId) &&
      (!f.paymentStatus || b.payment.status === f.paymentStatus) &&
      (!f.paymentMethod || b.payment.method === f.paymentMethod) &&
      (!f.from || b.scheduledDate >= f.from) &&
      (!f.to || b.scheduledDate <= f.to),
  );
}

const find = (id: string) => {
  const b = db.bookings.find((x) => x.id === id || x.code === id) ?? notFound('Booking');
  if (!inScope(b.city)) notFound('Booking');
  return b;
};

function refundTo(b: Booking, amount: number, reason: string, by: string) {
  const already = b.payment.refundedAmount ?? 0;
  const refundable = b.pricing.total - already;
  assert(amount > 0 && amount <= refundable, `Refund must be between ₹1 and ${formatMoney(refundable)}.`);
  b.payment.refundedAmount = already + amount;
  b.payment.status = b.payment.refundedAmount >= b.pricing.total ? 'refunded' : 'partially_refunded';
  b.timeline.push({ status: 'refund', at: new Date().toISOString(), note: `${formatMoney(amount)} refunded — ${reason}`, by });
  if (b.payment.method === 'wallet') {
    const c = db.customers.find((x) => x.id === b.customerId);
    if (c) {
      c.walletBalance += amount;
      db.walletTxns.unshift({ id: uid('wt'), userId: c.id, type: 'credit', amount, title: `Refund for ${b.code}`, reference: b.id, createdAt: new Date().toISOString() });
    }
  }
}

const mockImpl: BookingsApi = {
  list: (f) =>
    mock(() => {
      requirePerm('bookings.view', 'payments.view');
      const all = filterBookings({ ...f, status: 'all' });
      const today = todayKey();
      const counts: BookingCounts = {
        all: all.length,
        active: all.filter((b) => ['pending', 'confirmed', 'on_the_way', 'in_progress'].includes(b.status)).length,
        pending: all.filter((b) => b.status === 'pending').length,
        completed: all.filter((b) => b.status === 'completed').length,
        cancelled: all.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length,
        today: all.filter((b) => b.scheduledDate === today).length,
      };
      const page = paginate(filterBookings(f), f, {
        search: (b) => `${b.code} ${b.customerName} ${b.providerName} ${b.customerPhone} ${b.items.map((i) => i.title).join(' ')}`,
        sorters: { created: (b) => b.createdAt, scheduled: (b) => `${b.scheduledDate} ${b.slot}`, total: (b) => b.pricing.total, customer: (b) => b.customerName, provider: (b) => b.providerName, code: (b) => b.code },
        defaultSort: 'created',
        defaultDir: 'desc',
      });
      return { ...page, counts };
    }),
  get: (id) => mock(() => (requirePerm('bookings.view', 'payments.view'), find(id))),
  updateStatus: (id, status, note) =>
    mock(
      () => {
        const me = requirePerm('bookings.manage');
        const b = find(id);
        if (!STATUS_FLOW[b.status].includes(status)) throw new ApiError(`Can’t move a ${BOOKING_STATUS[b.status].label.toLowerCase()} booking to ${BOOKING_STATUS[status].label.toLowerCase()}.`, 409);
        b.status = status;
        b.timeline.push({ status, at: new Date().toISOString(), note: note || `Status updated by admin`, by: me.name });
        if (status === 'completed') {
          if (b.payment.status === 'pending') b.payment.status = 'paid';
          const p = db.providers.find((x) => x.id === b.providerId);
          if (p) p.jobsCompleted += 1;
        }
        if (status === 'rejected' && b.payment.status === 'paid') refundTo(b, b.pricing.total, 'Booking declined', me.name);
        audit('booking.status', 'Booking', `Changed ${b.code} to ${BOOKING_STATUS[status].label}`, b.code);
        return b;
      },
      { write: true },
    ),
  cancel: (id, reason, refund) =>
    mock(
      () => {
        const me = requirePerm('bookings.manage');
        const b = find(id);
        if (!STATUS_FLOW[b.status].includes('cancelled')) throw new ApiError('This booking can no longer be cancelled.', 409);
        assert(reason.trim().length >= 3, 'Please give a reason.');
        b.status = 'cancelled';
        b.cancelReason = reason;
        b.timeline.push({ status: 'cancelled', at: new Date().toISOString(), note: `Cancelled by admin: ${reason}`, by: me.name });
        if (refund && (b.payment.status === 'paid' || b.payment.status === 'partially_refunded')) refundTo(b, b.pricing.total - (b.payment.refundedAmount ?? 0), 'Admin cancellation', me.name);
        const task = db.deliveryTasks.find((t) => t.id === b.deliveryTaskId);
        if (task && task.status !== 'delivered') task.status = 'cancelled';
        audit('booking.cancel', 'Booking', `Cancelled ${b.code}${refund ? ' and refunded' : ''}: ${reason}`, b.code, 'warning');
        return b;
      },
      { write: true },
    ),
  reassign: (id, providerId, note) =>
    mock(
      () => {
        const me = requirePerm('bookings.manage');
        const b = find(id);
        assert(['pending', 'confirmed'].includes(b.status), 'Only pending or confirmed bookings can be reassigned.');
        const p = db.providers.find((x) => x.id === providerId) ?? notFound('Provider');
        assert(p.status === 'approved', 'Provider is not approved.');
        assert(p.id !== b.providerId, 'Booking is already assigned to this provider.');
        assert(p.categoryIds.includes(b.categoryId), `${p.businessName} doesn’t offer this category.`);
        const from = b.providerName;
        b.providerId = p.id;
        b.providerName = p.businessName;
        b.status = 'confirmed';
        b.timeline.push({ status: 'reassigned', at: new Date().toISOString(), note: `Reassigned from ${from} to ${p.businessName}${note ? ` — ${note}` : ''}`, by: me.name });
        audit('booking.reassign', 'Booking', `Reassigned ${b.code} to ${p.businessName}`, b.code, 'warning');
        return b;
      },
      { write: true },
    ),
  reschedule: (id, date, slot) =>
    mock(
      () => {
        const me = requirePerm('bookings.manage');
        const b = find(id);
        assert(['pending', 'confirmed'].includes(b.status), 'Only upcoming bookings can be rescheduled.');
        assert(date >= todayKey(), 'Pick today or a future date.');
        assert(/^\d{2}:\d{2}$/.test(slot), 'Pick a valid time slot.');
        b.scheduledDate = date;
        b.slot = slot;
        b.rescheduleCount += 1;
        b.timeline.push({ status: 'rescheduled', at: new Date().toISOString(), note: `Moved to ${date} ${slot}`, by: me.name });
        audit('booking.reschedule', 'Booking', `Rescheduled ${b.code} to ${date} ${slot}`, b.code);
        return b;
      },
      { write: true },
    ),
  refund: (id, amount, reason) =>
    mock(
      () => {
        const me = requirePerm('payments.refund');
        const b = find(id);
        assert(['paid', 'partially_refunded'].includes(b.payment.status), 'Only paid bookings can be refunded.');
        assert(reason.trim().length >= 3, 'Please give a reason.');
        refundTo(b, Math.round(amount), reason, me.name);
        audit('refund.issue', 'Booking', `Refunded ${formatMoney(amount)} on ${b.code}: ${reason}`, b.code, 'warning');
        return b;
      },
      { write: true },
    ),
  addNote: (id, note) =>
    mock(
      () => {
        const me = requirePerm('bookings.manage', 'support.manage');
        const b = find(id);
        assert(note.trim().length > 1, 'Note can’t be empty.');
        b.timeline.push({ status: 'note', at: new Date().toISOString(), note: note.trim(), by: me.name });
        return b;
      },
      { write: true },
    ),
};

const httpImpl: BookingsApi = {
  list: (f) => http('/bookings', { query: { ...f } }),
  get: (id) => http(`/bookings/${id}`),
  updateStatus: (id, status, note) => http(`/bookings/${id}/status`, { method: 'PATCH', body: { status, note } }),
  cancel: (id, reason, refund) => http(`/bookings/${id}/cancel`, { method: 'POST', body: { reason, refund } }),
  reassign: (id, providerId, note) => http(`/bookings/${id}/reassign`, { method: 'POST', body: { providerId, note } }),
  reschedule: (id, date, slot) => http(`/bookings/${id}/reschedule`, { method: 'POST', body: { date, slot } }),
  refund: (id, amount, reason) => http(`/bookings/${id}/refunds`, { method: 'POST', body: { amount, reason } }),
  addNote: (id, note) => http(`/bookings/${id}/notes`, { method: 'POST', body: { note } }),
};

export const bookingsApi: BookingsApi = env.useMocks ? mockImpl : httpImpl;
