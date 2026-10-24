import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { PROVIDER_STATUS } from '@/lib/status';
import type { ListParams, Paginated } from '@/types/admin';
import type { Booking, DocumentStatus, Payout, Provider, ProviderStatus, Review, Service } from '@/types/models';
import { http } from '../http';
import { assert, audit, inScope, mock, notFound, paginate, requirePerm, scopeCities } from '../mock/server';

export interface ProviderFilters extends Partial<ListParams> {
  status?: ProviderStatus | 'all';
  city?: string;
  categoryId?: string;
  type?: 'individual' | 'organization';
}

export interface ProviderDetail {
  provider: Provider;
  services: Service[];
  recentBookings: Booking[];
  payouts: Payout[];
  reviews: Review[];
  stats: { gmv: number; commission: number; bookings: number; completionRate: number; cancellationRate: number; activeServices: number };
}

export interface ProvidersApi {
  list(f: ProviderFilters): Promise<Paginated<Provider> & { counts: Record<ProviderStatus | 'all', number> }>;
  get(id: string): Promise<ProviderDetail>;
  setStatus(id: string, status: ProviderStatus, note?: string): Promise<Provider>;
  setCommission(id: string, rate: number): Promise<Provider>;
  setVisitingCharge(id: string, amount: number): Promise<Provider>;
  verifyDocument(id: string, docId: string, status: DocumentStatus, note?: string): Promise<Provider>;
  toggleFeatured(id: string): Promise<Provider>;
}

const find = (id: string) => {
  const p = db.providers.find((x) => x.id === id) ?? notFound('Provider');
  if (!inScope(p.city)) notFound('Provider');
  return p;
};

const mockImpl: ProvidersApi = {
  list: (f) =>
    mock(() => {
      requirePerm('providers.view');
      const scope = scopeCities();
      const base = db.providers.filter((p) => inScope(p.city, scope));
      const rows = base.filter(
        (p) =>
          (!f.status || f.status === 'all' || p.status === f.status) &&
          (!f.city || p.city === f.city) &&
          (!f.categoryId || p.categoryIds.includes(f.categoryId)) &&
          (!f.type || p.type === f.type),
      );
      const counts = { all: base.length } as Record<ProviderStatus | 'all', number>;
      (Object.keys(PROVIDER_STATUS) as ProviderStatus[]).forEach((s) => (counts[s] = base.filter((p) => p.status === s).length));
      return {
        ...paginate(rows, f, {
          search: (p) => `${p.businessName} ${p.ownerName} ${p.email} ${p.phone}`,
          sorters: { name: (p) => p.businessName, rating: (p) => p.rating, jobs: (p) => p.jobsCompleted, joined: (p) => p.joinedAt, commission: (p) => p.commissionRate },
          defaultSort: 'joined',
          defaultDir: 'desc',
        }),
        counts,
      };
    }),
  get: (id) =>
    mock(() => {
      requirePerm('providers.view');
      const provider = find(id);
      const bookings = db.bookings.filter((b) => b.providerId === id);
      const completed = bookings.filter((b) => b.status === 'completed');
      const services = db.services.filter((s) => s.providerId === id);
      return {
        provider,
        services,
        recentBookings: [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
        payouts: db.payouts.filter((p) => p.payeeId === id).slice(0, 8),
        reviews: db.reviews.filter((r) => r.providerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
        stats: {
          gmv: completed.reduce((s, b) => s + b.pricing.total, 0),
          commission: completed.reduce((s, b) => s + b.pricing.commission, 0),
          bookings: bookings.length,
          completionRate: bookings.length ? completed.length / bookings.length : 0,
          cancellationRate: bookings.length ? bookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length / bookings.length : 0,
          activeServices: services.filter((s) => s.active).length,
        },
      };
    }),
  setStatus: (id, status, note) =>
    mock(
      () => {
        requirePerm('providers.manage');
        const p = find(id);
        if (status === 'approved') {
          const blocking = p.documents.filter((d) => d.status === 'missing' || d.status === 'rejected');
          assert(!blocking.length, `Verify all documents first (${blocking.map((d) => d.name).join(', ')}).`);
          p.documents.forEach((d) => (d.status = 'verified'));
        }
        if (status === 'rejected' || status === 'suspended') assert((note ?? '').trim().length >= 5, 'Add a short reason — it is shared with the provider.');
        p.status = status;
        p.verified = status === 'approved';
        p.statusNote = note || undefined;
        if (status !== 'approved') db.services.filter((s) => s.providerId === id).forEach((s) => (s.active = false));
        else db.services.filter((s) => s.providerId === id).forEach((s) => (s.active = true));
        audit(`provider.${status === 'approved' ? 'approve' : status}`, 'Provider', `${PROVIDER_STATUS[status].label}: ${p.businessName}${note ? ` — ${note}` : ''}`, p.id, status === 'approved' ? 'info' : 'warning');
        return p;
      },
      { write: true },
    ),
  setCommission: (id, rate) =>
    mock(
      () => {
        requirePerm('providers.manage');
        assert(rate >= 0 && rate <= 50, 'Commission must be between 0 and 50%.');
        const p = find(id);
        const from = p.commissionRate;
        p.commissionRate = rate;
        audit('provider.commission', 'Provider', `Commission for ${p.businessName}: ${from}% → ${rate}%`, p.id, 'warning');
        return p;
      },
      { write: true },
    ),
  setVisitingCharge: (id, amount) =>
    mock(
      () => {
        requirePerm('providers.manage');
        assert(amount >= 0 && amount <= db.settings.maxVisitingCharge, `Visiting charge can be at most ₹${db.settings.maxVisitingCharge}.`);
        const p = find(id);
        p.visitingCharge = amount;
        audit('provider.visiting_charge', 'Provider', `Visiting charge for ${p.businessName} set to ₹${amount}`, p.id);
        return p;
      },
      { write: true },
    ),
  verifyDocument: (id, docId, status, note) =>
    mock(
      () => {
        requirePerm('providers.manage');
        const p = find(id);
        const d = p.documents.find((x) => x.id === docId) ?? notFound('Document');
        assert(d.status !== 'missing', 'This document hasn’t been uploaded yet.');
        if (status === 'rejected') assert((note ?? '').trim().length >= 3, 'Tell the provider why it was rejected.');
        d.status = status;
        d.note = note || undefined;
        audit('provider.document', 'Provider', `${d.name} ${status} for ${p.businessName}`, p.id);
        return p;
      },
      { write: true },
    ),
  toggleFeatured: (id) =>
    mock(
      () => {
        requirePerm('providers.manage');
        const p = find(id);
        p.featured = !p.featured;
        audit('provider.featured', 'Provider', `${p.featured ? 'Featured' : 'Unfeatured'} ${p.businessName}`, p.id);
        return p;
      },
      { write: true },
    ),
};

const httpImpl: ProvidersApi = {
  list: (f) => http('/providers', { query: { ...f } }),
  get: (id) => http(`/providers/${id}`),
  setStatus: (id, status, note) => http(`/providers/${id}/status`, { method: 'PATCH', body: { status, note } }),
  setCommission: (id, rate) => http(`/providers/${id}/commission`, { method: 'PUT', body: { rate } }),
  setVisitingCharge: (id, amount) => http(`/providers/${id}/visiting-charge`, { method: 'PUT', body: { amount } }),
  verifyDocument: (id, docId, status, note) => http(`/providers/${id}/documents/${docId}`, { method: 'PATCH', body: { status, note } }),
  toggleFeatured: (id) => http(`/providers/${id}/featured`, { method: 'POST' }),
};

export const providersApi: ProvidersApi = env.useMocks ? mockImpl : httpImpl;
