import { useMemo, useState, type ChangeEvent } from 'react';
import { Bell, Building, CalendarClock, CreditCard, Gift, Percent, Wallet } from 'lucide-react';
import { Button, Card, CardHeader, ErrorState, Input, PageHeader, PageLoader, Select, Switch, SwitchRow } from '@/components/ui';
import { useSettings } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { platformApi } from '@/services/api';
import { useUiStore } from '@/store/ui.store';
import { isApiError } from '@/services/http';
import type { PlatformSettings } from '@/types/admin';

const SECTIONS = [
  { id: 'general', label: 'General', icon: Building },
  { id: 'fees', label: 'Fees & tax', icon: Percent },
  { id: 'bookings', label: 'Booking rules', icon: CalendarClock },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
  { id: 'payments', label: 'Payment methods', icon: CreditCard },
  { id: 'referrals', label: 'Referrals', icon: Gift },
  { id: 'channels', label: 'Notification channels', icon: Bell },
];

const GATEWAYS: { key: keyof PlatformSettings['paymentGateways']; label: string; note: string }[] = [
  { key: 'upi', label: 'UPI', note: 'Google Pay, PhonePe, Paytm' },
  { key: 'card', label: 'Cards', note: 'Visa, Mastercard, RuPay, Amex' },
  { key: 'razorpay', label: 'Razorpay', note: 'Netbanking, EMI, pay later' },
  { key: 'stripe', label: 'Stripe', note: 'International cards' },
  { key: 'paystack', label: 'Paystack', note: 'Cards & bank transfer' },
  { key: 'flutterwave', label: 'Flutterwave', note: 'Mobile money & cards' },
];

export default function SettingsPage() {
  const q = useSettings();
  if (q.isPending) return <PageLoader />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  return <Editor key={JSON.stringify(q.data)} initial={q.data} />;
}

function Editor({ initial }: { initial: PlatformSettings }) {
  const [s, setS] = useState(initial);
  const [server, setServer] = useState<Record<string, string>>({});
  const collapsed = useUiStore((x) => x.sidebarCollapsed);
  const set = <K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) => (setServer((e) => ({ ...e, [k]: '' })), setS((p) => ({ ...p, [k]: v })));
  const num = (k: keyof PlatformSettings) => (e: ChangeEvent<HTMLInputElement>) => set(k, (Number(e.target.value.replace(/[^\d.]/g, '')) || 0) as never);
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);
  const errors = useMemo(() => {
    const e: Record<string, string> = { ...server };
    if (s.taxPercent < 0 || s.taxPercent > 40) e.taxPercent = 'Between 0 and 40%';
    if (s.defaultCommission > 50) e.defaultCommission = 'Max 50%';
    if (s.deliveryCommission > 50) e.deliveryCommission = 'Max 50%';
    if (s.minPayout < 100) e.minPayout = 'At least ₹100';
    if (!/^\S+@\S+\.\S+$/.test(s.supportEmail)) e.supportEmail = 'Enter a valid email';
    if (s.supportPhone.replace(/\D/g, '').length < 10) e.supportPhone = 'Enter a valid phone';
    if (!s.platformName.trim()) e.platformName = 'Required';
    if (s.maxReschedules > 10) e.maxReschedules = 'Max 10';
    if (!Object.values(s.paymentGateways).some(Boolean) && !s.cashOnService && !s.walletEnabled) e.paymentGateways = 'Keep at least one payment method on';
    return Object.fromEntries(Object.entries(e).filter(([, v]) => v));
  }, [s, server]);
  const hasErrors = Object.keys(errors).length > 0;
  const save = useApiMutation(() => platformApi.updateSettings(s), {
    invalidate: [qk.platform.settings, qk.platform.auditAll],
    success: 'Settings saved — apps pick them up within a minute',
    onError: (e) => isApiError(e) && e.fieldErrors && setServer(e.fieldErrors),
  });

  return (
    <>
      <PageHeader title="Global settings" description="Platform-wide rules applied to every city and app." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-22 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col">
            {SECTIONS.map((x) => (
              <li key={x.id} className="shrink-0">
                <a href={`#${x.id}`} className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-3 hover:text-ink">
                  <x.icon size={15} /> {x.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-4 pb-24">
          <Card id="general" className="scroll-mt-24">
            <CardHeader title="General" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Platform name" value={s.platformName} onChange={(e) => set('platformName', e.target.value)} error={errors.platformName} />
              <Select label="Time zone" value={s.timezone} onChange={(e) => set('timezone', e.target.value)} options={['Asia/Kolkata', 'Asia/Dubai', 'Africa/Lagos', 'Europe/London'].map((z) => ({ value: z, label: z }))} />
              <Input label="Support email" type="email" value={s.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} error={errors.supportEmail} />
              <Input label="Support phone" type="tel" value={s.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} error={errors.supportPhone} />
              <Select label="Currency" value={s.currency} onChange={(e) => set('currency', e.target.value)} options={[{ value: 'INR', label: 'INR — Indian rupee (₹)' }]} hint="Multi-currency needs backend support" />
            </div>
          </Card>

          <Card id="fees" className="scroll-mt-24">
            <CardHeader title="Fees & tax" subtitle="Category commission overrides the default" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Input label="GST / tax" suffix="%" inputMode="decimal" value={s.taxPercent} onChange={num('taxPercent')} error={errors.taxPercent} />
              <Input label="Default commission" suffix="%" inputMode="decimal" value={s.defaultCommission} onChange={num('defaultCommission')} error={errors.defaultCommission} />
              <Input label="Delivery commission" suffix="%" inputMode="decimal" value={s.deliveryCommission} onChange={num('deliveryCommission')} error={errors.deliveryCommission} hint="Share of each delivery fee" />
              <Input label="Max visiting charge" prefixText="₹" inputMode="numeric" value={s.maxVisitingCharge} onChange={num('maxVisitingCharge')} hint="Cap providers can set" />
            </div>
            <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">
              Example: a {formatMoney(1000)} service earns the platform {formatMoney((1000 * s.defaultCommission) / 100)} and the customer pays {formatMoney(1000 * (1 + s.taxPercent / 100))} incl. tax.
            </p>
          </Card>

          <Card id="bookings" className="scroll-mt-24">
            <CardHeader title="Booking rules" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Input label="Free cancellation" suffix="hrs" inputMode="numeric" value={s.cancellationWindowHours} onChange={num('cancellationWindowHours')} hint="Before slot start" />
              <Input label="Late cancellation fee" prefixText="₹" inputMode="numeric" value={s.lateCancellationFee} onChange={num('lateCancellationFee')} />
              <Input label="Reschedules allowed" inputMode="numeric" value={s.maxReschedules} onChange={num('maxReschedules')} error={errors.maxReschedules} />
              <Input label="Book ahead up to" suffix="days" inputMode="numeric" value={s.advanceBookingDays} onChange={num('advanceBookingDays')} />
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow title="Auto-approve new providers" description="Skip manual KYC review (not recommended)" checked={s.providerAutoApproval} onChange={(v) => set('providerAutoApproval', v)} />
            </div>
          </Card>

          <Card id="payouts" className="scroll-mt-24">
            <CardHeader title="Payouts" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Minimum payout" prefixText="₹" inputMode="numeric" value={s.minPayout} onChange={num('minPayout')} error={errors.minPayout} />
              <Select label="Payout cycle" value={s.payoutCycle} onChange={(e) => set('payoutCycle', e.target.value as PlatformSettings['payoutCycle'])} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Every 2 weeks' }, { value: 'monthly', label: 'Monthly' }]} />
              <Input label="Auto-approve below" prefixText="₹" inputMode="numeric" value={s.autoApprovePayoutsBelow} onChange={num('autoApprovePayoutsBelow')} hint="0 = review every request" />
            </div>
          </Card>

          <Card id="payments" className="scroll-mt-24">
            <CardHeader title="Payment methods" subtitle="Disabled methods disappear from checkout immediately. Gateway keys live on the server only." />
            {errors.paymentGateways ? <p className="mb-2 text-sm font-medium text-danger-600">{errors.paymentGateways}</p> : null}
            <div className="grid gap-x-6 sm:grid-cols-2">
              {GATEWAYS.map((g) => (
                <div key={g.key} className="flex items-center justify-between gap-3 border-b border-line py-3">
                  <span>
                    <span className="block font-medium text-ink">{g.label}</span>
                    <span className="text-xs text-ink-3">{g.note}</span>
                  </span>
                  <Switch label={g.label} checked={s.paymentGateways[g.key]} onChange={(v) => set('paymentGateways', { ...s.paymentGateways, [g.key]: v })} />
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-b border-line py-3">
                <span>
                  <span className="block font-medium text-ink">Servio Wallet</span>
                  <span className="text-xs text-ink-3">Pay from wallet balance</span>
                </span>
                <Switch label="Wallet" checked={s.walletEnabled} onChange={(v) => set('walletEnabled', v)} />
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-line py-3">
                <span>
                  <span className="block font-medium text-ink">Pay after service</span>
                  <span className="text-xs text-ink-3">Cash or UPI to the professional</span>
                </span>
                <Switch label="Pay after service" checked={s.cashOnService} onChange={(v) => set('cashOnService', v)} />
              </div>
            </div>
          </Card>

          <Card id="referrals" className="scroll-mt-24">
            <CardHeader title="Referrals" subtitle="Credited to Servio Wallet after the friend’s first completed booking" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Referrer reward" prefixText="₹" inputMode="numeric" value={s.referrerBonus} onChange={num('referrerBonus')} />
              <Input label="New customer reward" prefixText="₹" inputMode="numeric" value={s.refereeBonus} onChange={num('refereeBonus')} />
            </div>
          </Card>

          <Card id="channels" className="scroll-mt-24">
            <CardHeader title="Notification channels" />
            <div className="grid gap-x-6 sm:grid-cols-2">
              {(['push', 'sms', 'email', 'whatsapp'] as const).map((c) => (
                <div key={c} className="flex items-center justify-between border-b border-line py-3">
                  <span className="font-medium capitalize text-ink">{c === 'sms' ? 'SMS' : c === 'whatsapp' ? 'WhatsApp' : c}</span>
                  <Switch label={c} checked={s.channels[c]} onChange={(v) => set('channels', { ...s.channels, [c]: v })} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className={cn('fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur transition-transform duration-300', collapsed ? 'lg:left-[var(--width-sidebar-collapsed)]' : 'lg:left-[var(--width-sidebar)]', dirty ? 'translate-y-0' : 'translate-y-full')} aria-hidden={!dirty}>
        <div className="mx-auto flex max-w-[var(--container-page)] flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-7">
          <p className="text-sm text-ink-2">{hasErrors ? <span className="text-danger-600">Fix {Object.keys(errors).length} field(s) before saving.</span> : 'You have unsaved changes.'}</p>
          <div className="flex gap-2">
            <Button variant="outline" tabIndex={dirty ? 0 : -1} onClick={() => (setS(initial), setServer({}))}>
              Discard
            </Button>
            <Button variant="panel" tabIndex={dirty ? 0 : -1} disabled={hasErrors} loading={save.isPending} onClick={() => save.mutate()}>
              Save settings
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
