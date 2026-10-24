import { Ban, CalendarClock, CheckCheck, CircleDot, Clock, CreditCard, Navigation, RefreshCw, StickyNote, Undo2, Wrench, XCircle, type LucideIcon } from 'lucide-react';
import { Select, type SelectProps } from '@/components/ui';
import { toneClasses } from '@/config/theme';
import { useLookups } from '@/hooks/queries';
import { useAdmin } from '@/hooks/useAccess';
import { cn } from '@/lib/cn';
import { formatDateTime, formatMoney } from '@/lib/format';
import { BOOKING_STATUS } from '@/lib/status';
import type { Booking, BookingEvent, PriceBreakdown } from '@/types/models';

const EVENT_ICON: Record<BookingEvent['status'], { icon: LucideIcon; tone: keyof typeof toneClasses; label: string }> = {
  pending: { icon: Clock, tone: 'warning', label: 'Booking placed' },
  confirmed: { icon: CheckCheck, tone: 'primary', label: 'Confirmed' },
  on_the_way: { icon: Navigation, tone: 'info', label: 'Professional on the way' },
  in_progress: { icon: Wrench, tone: 'highlight', label: 'Service started' },
  completed: { icon: CheckCheck, tone: 'success', label: 'Completed' },
  cancelled: { icon: XCircle, tone: 'danger', label: 'Cancelled' },
  rejected: { icon: Ban, tone: 'neutral', label: 'Declined by provider' },
  rescheduled: { icon: CalendarClock, tone: 'accent', label: 'Rescheduled' },
  payment: { icon: CreditCard, tone: 'success', label: 'Payment' },
  refund: { icon: Undo2, tone: 'info', label: 'Refund issued' },
  reassigned: { icon: RefreshCw, tone: 'accent', label: 'Provider reassigned' },
  note: { icon: StickyNote, tone: 'neutral', label: 'Internal note' },
};

const title = (e: BookingEvent) => (e.status in BOOKING_STATUS && e.status !== 'pending' ? BOOKING_STATUS[e.status as keyof typeof BOOKING_STATUS].label : (EVENT_ICON[e.status]?.label ?? e.status));

export function BookingTimeline({ events }: { events: BookingEvent[] }) {
  const list = [...events].reverse();
  return (
    <ol className="relative flex flex-col gap-4">
      {list.map((e, i) => {
        const m = EVENT_ICON[e.status] ?? { icon: CircleDot, tone: 'neutral', label: e.status };
        return (
          <li key={`${e.at}-${i}`} className="relative flex gap-3">
            {i < list.length - 1 ? <span className="absolute left-[15px] top-8 h-[calc(100%-12px)] w-px bg-line" aria-hidden /> : null}
            <span className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', toneClasses[m.tone].soft)}>
              <m.icon size={15} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-ink">{title(e)}</p>
              {e.note && e.note !== title(e) ? <p className="text-sm text-ink-2 [overflow-wrap:anywhere]">{e.note}</p> : null}
              <p className="text-xs text-ink-3">
                {formatDateTime(e.at)}
                {e.by ? <span> by {e.by}</span> : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PriceSummary({ pricing, promoCode, refunded }: { pricing: PriceBreakdown; promoCode?: string; refunded?: number }) {
  const row = (label: string, value: string, cls?: string) => (
    <div className={cn('flex justify-between py-1 text-base', cls)}>
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-medium tabular text-ink">{value}</dd>
    </div>
  );
  return (
    <dl>
      {row('Subtotal', formatMoney(pricing.subtotal))}
      {pricing.discount ? row(`Discount${promoCode ? ` (${promoCode})` : ''}`, `−${formatMoney(pricing.discount)}`, '[&_dd]:text-success-600') : null}
      {row('Visiting charge', pricing.visitingCharge ? formatMoney(pricing.visitingCharge) : 'Free')}
      {row('Tax', formatMoney(pricing.tax))}
      <div className="mt-1.5 flex justify-between border-t border-dashed border-line pt-2.5 text-md">
        <dt className="font-semibold text-ink">Total</dt>
        <dd className="font-bold tabular text-ink">{formatMoney(pricing.total)}</dd>
      </div>
      {refunded ? row('Refunded', `−${formatMoney(refunded)}`, '[&_dd]:text-info-600') : null}
      <div className="mt-2 flex justify-between rounded-lg bg-panel-soft px-3 py-2 text-sm">
        <dt className="text-panel-ink">Platform commission</dt>
        <dd className="font-semibold tabular text-panel-ink">{formatMoney(pricing.commission)}</dd>
      </div>
    </dl>
  );
}

type LookupSelectProps = Omit<SelectProps, 'options'> & { allLabel?: string };

/** City filter limited to the admin's city scope. */
export function CitySelect({ allLabel = 'All cities', ...rest }: LookupSelectProps) {
  const q = useLookups();
  const admin = useAdmin();
  const scope = admin?.cityScope ?? [];
  const cities = (q.data?.cities ?? []).filter((c) => !scope.length || scope.includes(c.name));
  return <Select aria-label="City" compact placeholder={allLabel} options={cities.map((c) => ({ value: c.name, label: c.name }))} {...rest} />;
}

export function CategorySelect({ allLabel = 'All categories', parentsOnly = true, ...rest }: LookupSelectProps & { parentsOnly?: boolean }) {
  const q = useLookups();
  const cats = (q.data?.categories ?? []).filter((c) => !parentsOnly || !c.parentId);
  return <Select aria-label="Category" compact placeholder={allLabel} options={cats.map((c) => ({ value: c.id, label: c.name }))} {...rest} />;
}

export const isActiveBooking = (b: Booking) => ['pending', 'confirmed', 'on_the_way', 'in_progress'].includes(b.status);
