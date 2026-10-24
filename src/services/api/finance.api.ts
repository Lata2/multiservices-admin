import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { formatMoney } from '@/lib/format';
import { PAYOUT_STATUS } from '@/lib/status';
import type { ListParams, Paginated } from '@/types/admin';
import type { Payout, PayoutStatus, Transaction, TransactionKind } from '@/types/models';
import { http } from '../http';
import { assert, audit, inScope, mock, notFound, paginate, requirePerm, scopeCities } from '../mock/server';

export interface TransactionFilters extends Partial<ListParams> {
  kind?: TransactionKind | 'all';
  status?: Transaction['status'];
  method?: string;
  city?: string;
  days?: number;
}

export interface FinanceSummary {
  collected: number;
  refunds: number;
  commission: number;
  tax: number;
  payoutsPaid: number;
  payoutsPending: number;
  pendingCount: number;
  cashPending: number;
  methodMix: { method: string; amount: number }[];
  daily: { label: string; collected: number; refunds: number }[];
}

export interface PayoutFilters extends Partial<ListParams> {
  status?: PayoutStatus | 'all';
  role?: 'provider' | 'delivery';
}

export interface FinanceApi {
  summary(days: number): Promise<FinanceSummary>;
  transactions(f: TransactionFilters): Promise<Paginated<Transaction>>;
  payouts(f: PayoutFilters): Promise<Paginated<Payout> & { counts: Record<PayoutStatus | 'all', number>; pendingAmount: number }>;
  processPayout(id: string, action: 'approve' | 'pay' | 'reject', opts?: { utr?: string; note?: string }): Promise<Payout>;
  bulkPay(ids: string[]): Promise<{ paid: number; amount: number }>;
}

function ledger(): Transaction[] {
  const scope = scopeCities();
  const rows: Transaction[] = [];
  for (const b of db.bookings) {
    if (!inScope(b.city, scope)) continue;
    const paidAt = b.timeline.find((e) => e.status === 'completed')?.at ?? b.createdAt;
    if (b.payment.method !== 'cash' || b.payment.status !== 'pending') {
      const online = b.payment.method !== 'cash';
      if (online || b.status === 'completed')
        rows.push({ id: `tx_p_${b.id}`, kind: 'payment', reference: b.payment.transactionId ?? `CASH-${b.code}`, bookingId: b.id, partyName: b.customerName, method: b.payment.method, amount: b.pricing.total, status: 'success', city: b.city, createdAt: online ? b.createdAt : paidAt });
    }
    if (b.payment.refundedAmount) {
      const at = [...b.timeline].reverse().find((e) => e.status === 'refund')?.at ?? b.createdAt;
      rows.push({ id: `tx_r_${b.id}`, kind: 'refund', reference: `RFD-${b.code}`, bookingId: b.id, partyName: b.customerName, method: b.payment.method, amount: b.payment.refundedAmount, status: 'success', city: b.city, createdAt: at });
    }
  }
  for (const p of db.payouts) {
    if (p.status === 'rejected') continue;
    rows.push({ id: `tx_po_${p.id}`, kind: 'payout', reference: p.utr ?? p.id.toUpperCase(), partyName: p.payeeName, method: p.method === 'bank' ? 'bank' : 'upi_payout', amount: p.amount, status: p.status === 'paid' ? 'success' : 'pending', createdAt: p.processedAt ?? p.requestedAt });
  }
  for (const w of db.walletTxns) {
    const c = db.customers.find((x) => x.id === w.userId);
    if (!c || !inScope(c.city, scope)) continue;
    rows.push({ id: `tx_w_${w.id}`, kind: w.type === 'credit' ? 'wallet_credit' : 'wallet_debit', reference: w.reference ?? w.id.toUpperCase(), partyName: c.name, method: 'wallet', amount: w.amount, status: 'success', city: c.city, createdAt: w.createdAt });
  }
  return rows;
}

const DAY = 86_400_000;

const mockImpl: FinanceApi = {
  summary: (days) =>
    mock(() => {
      requirePerm('payments.view', 'payouts.view');
      const since = Date.now() - days * DAY;
      const scope = scopeCities();
      const bks = db.bookings.filter((b) => inScope(b.city, scope) && new Date(b.createdAt).getTime() >= since);
      const tx = ledger().filter((t) => new Date(t.createdAt).getTime() >= since);
      const payments = tx.filter((t) => t.kind === 'payment');
      const mix = new Map<string, number>();
      payments.forEach((t) => mix.set(String(t.method), (mix.get(String(t.method)) ?? 0) + t.amount));
      const buckets = Math.min(days, 30);
      const daily = Array.from({ length: buckets }, (_, i) => {
        const start = Date.now() - (buckets - i) * (days / buckets) * DAY;
        const end = start + (days / buckets) * DAY;
        const inB = (t: Transaction) => {
          const at = new Date(t.createdAt).getTime();
          return at >= start && at < end;
        };
        return {
          label: new Date(end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          collected: payments.filter(inB).reduce((s, t) => s + t.amount, 0),
          refunds: tx.filter((t) => t.kind === 'refund' && inB(t)).reduce((s, t) => s + t.amount, 0),
        };
      });
      const pending = db.payouts.filter((p) => p.status === 'requested' || p.status === 'approved');
      return {
        collected: payments.reduce((s, t) => s + t.amount, 0),
        refunds: tx.filter((t) => t.kind === 'refund').reduce((s, t) => s + t.amount, 0),
        commission: bks.filter((b) => b.status === 'completed').reduce((s, b) => s + b.pricing.commission, 0),
        tax: bks.filter((b) => b.status === 'completed').reduce((s, b) => s + b.pricing.tax, 0),
        payoutsPaid: tx.filter((t) => t.kind === 'payout' && t.status === 'success').reduce((s, t) => s + t.amount, 0),
        payoutsPending: pending.reduce((s, p) => s + p.amount, 0),
        pendingCount: pending.length,
        cashPending: db.bookings.filter((b) => inScope(b.city, scope) && b.payment.method === 'cash' && b.payment.status === 'pending' && b.status !== 'cancelled' && b.status !== 'rejected').reduce((s, b) => s + b.pricing.total, 0),
        methodMix: [...mix.entries()].map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount),
        daily,
      };
    }),
  transactions: (f) =>
    mock(() => {
      requirePerm('payments.view');
      const since = f.days ? Date.now() - f.days * DAY : 0;
      const rows = ledger().filter(
        (t) =>
          (!f.kind || f.kind === 'all' || t.kind === f.kind) &&
          (!f.status || t.status === f.status) &&
          (!f.method || t.method === f.method) &&
          (!f.city || t.city === f.city) &&
          new Date(t.createdAt).getTime() >= since,
      );
      return paginate(rows, f, {
        search: (t) => `${t.reference} ${t.partyName}`,
        sorters: { date: (t) => t.createdAt, amount: (t) => t.amount, party: (t) => t.partyName },
        defaultSort: 'date',
        defaultDir: 'desc',
      });
    }),
  payouts: (f) =>
    mock(() => {
      requirePerm('payouts.view');
      const base = db.payouts.filter((p) => !f.role || p.payeeRole === f.role);
      const rows = base.filter((p) => !f.status || f.status === 'all' || p.status === f.status);
      const counts = { all: base.length } as Record<PayoutStatus | 'all', number>;
      (Object.keys(PAYOUT_STATUS) as PayoutStatus[]).forEach((s) => (counts[s] = base.filter((p) => p.status === s).length));
      return {
        ...paginate(rows, f, {
          search: (p) => `${p.payeeName} ${p.utr ?? ''} ${p.accountRef}`,
          sorters: { requested: (p) => p.requestedAt, amount: (p) => p.amount, payee: (p) => p.payeeName },
          defaultSort: 'requested',
          defaultDir: 'desc',
        }),
        counts,
        pendingAmount: base.filter((p) => p.status === 'requested' || p.status === 'approved').reduce((s, p) => s + p.amount, 0),
      };
    }),
  processPayout: (id, action, opts = {}) =>
    mock(
      () => {
        requirePerm('payouts.manage');
        const p = db.payouts.find((x) => x.id === id) ?? notFound('Payout');
        assert(p.status === 'requested' || p.status === 'approved', 'This payout has already been processed.');
        if (action === 'approve') {
          assert(p.status === 'requested', 'Already approved.');
          p.status = 'approved';
        } else if (action === 'pay') {
          const utr = opts.utr?.trim() || `UTR${Date.now().toString().slice(-9)}`;
          assert(/^[A-Z0-9]{6,22}$/i.test(utr), 'Enter a valid UTR / reference number.');
          p.status = 'paid';
          p.utr = utr.toUpperCase();
          p.processedAt = new Date().toISOString();
          const prov = db.providers.find((x) => x.id === p.payeeId);
          if (prov) prov.walletBalance = Math.max(0, prov.walletBalance - p.amount);
        } else {
          assert((opts.note ?? '').trim().length >= 5, 'Tell the payee why the payout was rejected.');
          p.status = 'rejected';
          p.note = opts.note;
          p.processedAt = new Date().toISOString();
        }
        audit(`payout.${action}`, 'Payout', `${action === 'pay' ? 'Paid' : action === 'approve' ? 'Approved' : 'Rejected'} ${formatMoney(p.amount)} to ${p.payeeName}`, p.id, action === 'reject' ? 'warning' : 'info');
        return p;
      },
      { write: true },
    ),
  bulkPay: (ids) =>
    mock(
      () => {
        requirePerm('payouts.manage');
        let paid = 0;
        let amount = 0;
        for (const id of ids) {
          const p = db.payouts.find((x) => x.id === id);
          if (!p || (p.status !== 'requested' && p.status !== 'approved')) continue;
          p.status = 'paid';
          p.utr = `UTR${(Date.now() + paid).toString().slice(-9)}`;
          p.processedAt = new Date().toISOString();
          paid += 1;
          amount += p.amount;
        }
        assert(paid > 0, 'None of the selected payouts can be paid.');
        audit('payout.bulk_pay', 'Payout', `Bulk paid ${paid} payouts totalling ${formatMoney(amount)}`, undefined, 'warning');
        return { paid, amount };
      },
      { write: true, latency: 900 },
    ),
};

const httpImpl: FinanceApi = {
  summary: (days) => http('/finance/summary', { query: { days } }),
  transactions: (f) => http('/finance/transactions', { query: { ...f } }),
  payouts: (f) => http('/payouts', { query: { ...f } }),
  processPayout: (id, action, opts) => http(`/payouts/${id}/${action}`, { method: 'POST', body: opts }),
  bulkPay: (ids) => http('/payouts/bulk-pay', { method: 'POST', body: { ids } }),
};

export const financeApi: FinanceApi = env.useMocks ? mockImpl : httpImpl;
