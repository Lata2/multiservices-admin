import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { uid } from '@/mocks/helpers';
import { formatMoney } from '@/lib/format';
import type { ListParams, Paginated } from '@/types/admin';
import type { AccountStatus, Booking, Customer, SupportTicket, WalletTransaction } from '@/types/models';
import { http } from '../http';
import { assert, audit, inScope, mock, notFound, paginate, requirePerm, scopeCities } from '../mock/server';

export interface CustomerFilters extends Partial<ListParams> {
  status?: AccountStatus | 'all';
  city?: string;
  segment?: 'new' | 'repeat' | 'inactive' | 'all';
}

export interface CustomerDetail {
  customer: Customer;
  bookings: Booking[];
  wallet: WalletTransaction[];
  tickets: SupportTicket[];
  stats: { completed: number; cancelled: number; avgOrder: number; favouriteCategory?: string };
}

export interface CustomersApi {
  list(f: CustomerFilters): Promise<Paginated<Customer> & { counts: Record<'all' | 'active' | 'blocked' | 'new', number> }>;
  get(id: string): Promise<CustomerDetail>;
  setStatus(id: string, status: AccountStatus, reason?: string): Promise<Customer>;
  adjustWallet(id: string, type: 'credit' | 'debit', amount: number, reason: string): Promise<Customer>;
}

const DAY = 86_400_000;

const mockImpl: CustomersApi = {
  list: (f) =>
    mock(() => {
      requirePerm('customers.view');
      const scope = scopeCities();
      const base = db.customers.filter((c) => inScope(c.city, scope));
      const isNew = (c: Customer) => Date.now() - new Date(c.createdAt).getTime() < 30 * DAY;
      const rows = base.filter(
        (c) =>
          (!f.status || f.status === 'all' || c.status === f.status) &&
          (!f.city || c.city === f.city) &&
          (!f.segment || f.segment === 'all' || (f.segment === 'new' ? isNew(c) : f.segment === 'repeat' ? c.bookingsCount > 1 : Date.now() - new Date(c.lastActiveAt).getTime() > 30 * DAY)),
      );
      return {
        ...paginate(rows, f, {
          search: (c) => `${c.name} ${c.email} ${c.phone}`,
          sorters: { name: (c) => c.name, joined: (c) => c.createdAt, bookings: (c) => c.bookingsCount, spent: (c) => c.totalSpent, wallet: (c) => c.walletBalance, active: (c) => c.lastActiveAt },
          defaultSort: 'joined',
          defaultDir: 'desc',
        }),
        counts: { all: base.length, active: base.filter((c) => c.status === 'active').length, blocked: base.filter((c) => c.status === 'blocked').length, new: base.filter(isNew).length },
      };
    }),
  get: (id) =>
    mock(() => {
      requirePerm('customers.view');
      const customer = db.customers.find((c) => c.id === id) ?? notFound('Customer');
      if (!inScope(customer.city)) notFound('Customer');
      const bookings = db.bookings.filter((b) => b.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const completed = bookings.filter((b) => b.status === 'completed');
      const catCount = new Map<string, number>();
      bookings.forEach((b) => catCount.set(b.categoryId, (catCount.get(b.categoryId) ?? 0) + 1));
      const fav = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        customer,
        bookings,
        wallet: db.walletTxns.filter((t) => t.userId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        tickets: db.tickets.filter((t) => t.userId === id),
        stats: {
          completed: completed.length,
          cancelled: bookings.filter((b) => b.status === 'cancelled').length,
          avgOrder: completed.length ? Math.round(completed.reduce((s, b) => s + b.pricing.total, 0) / completed.length) : 0,
          favouriteCategory: fav ? db.categories.find((c) => c.id === fav)?.name : undefined,
        },
      };
    }),
  setStatus: (id, status, reason) =>
    mock(
      () => {
        requirePerm('customers.manage');
        const c = db.customers.find((x) => x.id === id) ?? notFound('Customer');
        c.status = status;
        audit(status === 'blocked' ? 'customer.block' : 'customer.unblock', 'Customer', `${status === 'blocked' ? 'Blocked' : 'Reactivated'} ${c.name}${reason ? `: ${reason}` : ''}`, c.id, status === 'blocked' ? 'warning' : 'info');
        return c;
      },
      { write: true },
    ),
  adjustWallet: (id, type, amount, reason) =>
    mock(
      () => {
        requirePerm('customers.manage');
        const c = db.customers.find((x) => x.id === id) ?? notFound('Customer');
        const amt = Math.round(amount);
        assert(amt > 0 && amt <= 10000, 'Amount must be between ₹1 and ₹10,000.');
        assert(reason.trim().length >= 3, 'Please give a reason.');
        if (type === 'debit') assert(amt <= c.walletBalance, 'Debit can’t exceed the wallet balance.');
        c.walletBalance += type === 'credit' ? amt : -amt;
        db.walletTxns.unshift({ id: uid('wt'), userId: c.id, type, amount: amt, title: `${type === 'credit' ? 'Goodwill credit' : 'Adjustment'} — ${reason}`, createdAt: new Date().toISOString() });
        audit('customer.wallet', 'Customer', `${type === 'credit' ? 'Credited' : 'Debited'} ${formatMoney(amt)} ${type === 'credit' ? 'to' : 'from'} ${c.name}'s wallet`, c.id, 'warning');
        return c;
      },
      { write: true },
    ),
};

const httpImpl: CustomersApi = {
  list: (f) => http('/customers', { query: { ...f } }),
  get: (id) => http(`/customers/${id}`),
  setStatus: (id, status, reason) => http(`/customers/${id}/status`, { method: 'PATCH', body: { status, reason } }),
  adjustWallet: (id, type, amount, reason) => http(`/customers/${id}/wallet`, { method: 'POST', body: { type, amount, reason } }),
};

export const customersApi: CustomersApi = env.useMocks ? mockImpl : httpImpl;
