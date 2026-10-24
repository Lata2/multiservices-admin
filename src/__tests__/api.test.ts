import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb, db } from '@/mocks/db';
import { bookingsApi, customersApi, financeApi, platformApi } from '@/services/api';
import { setSession } from '@/services/session';
import { can, SUPER_ONLY } from '@/lib/permissions';
import { toCsv } from '@/lib/csv';
import { paginate } from '@/services/mock/server';

const as = (adminId: string) => setSession(`test.${adminId}`, adminId);

beforeEach(() => {
  resetDb();
  as('adm_2'); // Operations Admin
});

describe('permissions', () => {
  it('can() matches any of the required permissions', () => {
    expect(can(['bookings.view'], ['bookings.manage', 'bookings.view'])).toBe(true);
    expect(can(['bookings.view'], 'bookings.manage')).toBe(false);
    expect(can(undefined, 'bookings.view')).toBe(false);
    expect(can([], undefined)).toBe(true);
  });

  it('API rejects actions outside the role (finance cannot cancel bookings)', async () => {
    as('adm_3');
    const pending = db.bookings.find((b) => b.status === 'pending')!;
    await expect(bookingsApi.cancel(pending.id, 'Testing', true)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects unauthenticated calls with 401', async () => {
    setSession(null, null);
    await expect(bookingsApi.list({})).rejects.toMatchObject({ status: 401 });
  });

  it('strips super-only permissions from custom roles', async () => {
    as('adm_1');
    const role = await platformApi.saveRole({ name: 'Sneaky', description: '', color: 'info', permissions: ['bookings.view', 'settings.manage', 'audit.view'] });
    expect(role.permissions).toContain('bookings.view');
    for (const p of SUPER_ONLY) expect(role.permissions).not.toContain(p);
    expect(role.permissions).toContain('dashboard.view');
  });
});

describe('city scoping', () => {
  it('city manager only sees bookings in assigned cities', async () => {
    as('adm_5');
    const r = await bookingsApi.list({ pageSize: 100 });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.items.every((b) => ['Mumbai', 'Pune'].includes(b.city))).toBe(true);
    const outside = db.bookings.find((b) => b.city === 'Bengaluru')!;
    await expect(bookingsApi.get(outside.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('bookings', () => {
  it('cancelling a paid booking refunds it and logs an audit entry', async () => {
    const b = db.bookings.find((x) => x.status === 'confirmed' && x.payment.status === 'paid')!;
    const before = db.auditLogs.length;
    const r = await bookingsApi.cancel(b.id, 'Provider unavailable', true);
    expect(r.status).toBe('cancelled');
    expect(r.payment.status).toBe('refunded');
    expect(r.payment.refundedAmount).toBe(r.pricing.total);
    expect(db.auditLogs.length).toBe(before + 1);
    expect(db.auditLogs[0].action).toBe('booking.cancel');
  });

  it('enforces the status flow', async () => {
    const done = db.bookings.find((x) => x.status === 'completed')!;
    await expect(bookingsApi.updateStatus(done.id, 'in_progress')).rejects.toMatchObject({ status: 409 });
  });

  it('partial refunds cannot exceed the amount paid', async () => {
    const b = db.bookings.find((x) => x.status === 'completed' && x.payment.status === 'paid')!;
    const half = Math.floor(b.pricing.total / 2);
    const r = await bookingsApi.refund(b.id, half, 'Partial service');
    expect(r.payment.status).toBe('partially_refunded');
    await expect(bookingsApi.refund(b.id, b.pricing.total, 'Too much')).rejects.toMatchObject({ status: 400 });
  });
});

describe('finance & customers', () => {
  it('pays a payout once only', async () => {
    as('adm_3');
    const p = db.payouts.find((x) => x.status === 'requested')!;
    const r = await financeApi.processPayout(p.id, 'pay', { utr: 'UTR12345678' });
    expect(r.status).toBe('paid');
    await expect(financeApi.processPayout(p.id, 'pay')).rejects.toMatchObject({ status: 400 });
  });

  it('wallet debit cannot exceed the balance', async () => {
    const c = db.customers.find((x) => x.walletBalance > 0)!;
    const start = c.walletBalance;
    await expect(customersApi.adjustWallet(c.id, 'debit', c.walletBalance + 1, 'Too much')).rejects.toBeTruthy();
    const r = await customersApi.adjustWallet(c.id, 'credit', 200, 'Goodwill');
    expect(r.walletBalance).toBe(start + 200);
  });
});

describe('utilities', () => {
  it('paginates, searches and sorts like a server', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `Row ${i}` }));
    const r = paginate(rows, { page: 3, pageSize: 10, sort: 'id', dir: 'asc' }, { sorters: { id: (x) => x.id }, search: (x) => x.name });
    expect(r.items.map((x) => x.id)).toEqual([20, 21, 22, 23, 24]);
    expect(r.pageCount).toBe(3);
    expect(paginate(rows, { search: 'row 1', pageSize: 50 }, { search: (x) => x.name }).total).toBe(11);
    expect(paginate(rows, { page: 99, pageSize: 10 }).page).toBe(3);
  });

  it('CSV export quotes values and neutralises formulas', () => {
    expect(toCsv([['a,b', '=SUM(A1)', 'x"y']])).toBe('"a,b",\'=SUM(A1),"x""y"');
  });
});
