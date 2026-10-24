import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { uid } from '@/mocks/helpers';
import type { Audience, Broadcast, Channel } from '@/types/admin';
import type { Banner, PromoCode } from '@/types/models';
import { ApiError, http } from '../http';
import { assert, audit, currentAdmin, mock, notFound, requirePerm } from '../mock/server';

export type PromoInput = Omit<PromoCode, 'id' | 'usageCount'>;
export type BannerInput = Omit<Banner, 'id' | 'clicks' | 'impressions'>;
export interface BroadcastInput {
  title: string;
  body: string;
  audience: Audience;
  city: string | null;
  channels: Channel[];
  scheduledFor?: string;
  asDraft?: boolean;
}

export interface MarketingApi {
  promos(): Promise<PromoCode[]>;
  savePromo(input: PromoInput, id?: string): Promise<PromoCode>;
  togglePromo(id: string): Promise<PromoCode>;
  deletePromo(id: string): Promise<{ ok: true }>;
  banners(): Promise<Banner[]>;
  saveBanner(input: BannerInput, id?: string): Promise<Banner>;
  toggleBanner(id: string): Promise<Banner>;
  deleteBanner(id: string): Promise<{ ok: true }>;
  moveBanner(id: string, dir: -1 | 1): Promise<Banner[]>;
  broadcasts(): Promise<Broadcast[]>;
  audienceSize(audience: Audience, city: string | null): Promise<number>;
  sendBroadcast(input: BroadcastInput): Promise<Broadcast>;
  deleteBroadcast(id: string): Promise<{ ok: true }>;
}

function audienceCount(audience: Audience, city: string | null) {
  const inCity = (c: string) => !city || c === city;
  const cust = db.customers.filter((c) => c.status === 'active' && inCity(c.city)).length * 57; // each seeded customer ≈ 57 real users
  const prov = db.providers.filter((p) => p.status === 'approved' && inCity(p.city)).length * 18;
  const del = db.partners.filter((p) => p.status === 'approved' && inCity(p.city)).length * 6;
  return audience === 'customer' ? cust : audience === 'provider' ? prov : audience === 'delivery' ? del : cust + prov + del;
}

const mockImpl: MarketingApi = {
  promos: () => mock(() => (requirePerm('marketing.manage'), [...db.promoCodes].sort((a, b) => Number(b.active) - Number(a.active) || b.expiresAt.localeCompare(a.expiresAt)))),
  savePromo: (input, id) =>
    mock(
      () => {
        requirePerm('marketing.manage');
        const code = input.code.trim().toUpperCase();
        if (db.promoCodes.some((p) => p.code === code && p.id !== id)) throw new ApiError('This code already exists.', 409, 'CONFLICT', { code: 'Code already exists' });
        assert(input.expiresAt > input.startsAt, 'End date must be after the start date.');
        if (input.discountType === 'percent') assert(input.value > 0 && input.value <= 90, 'Percent must be between 1 and 90.');
        if (id) {
          const p = db.promoCodes.find((x) => x.id === id) ?? notFound('Promo code');
          Object.assign(p, { ...input, code });
          audit('promo.update', 'PromoCode', `Updated promo ${code}`, p.id);
          return p;
        }
        const p: PromoCode = { ...input, code, id: uid('pr'), usageCount: 0 };
        db.promoCodes.unshift(p);
        audit('promo.create', 'PromoCode', `Created promo ${code}`, p.id);
        return p;
      },
      { write: true },
    ),
  togglePromo: (id) =>
    mock(
      () => {
        requirePerm('marketing.manage');
        const p = db.promoCodes.find((x) => x.id === id) ?? notFound('Promo code');
        if (!p.active) assert(new Date(p.expiresAt).getTime() > Date.now(), 'This code has expired — extend the end date first.');
        p.active = !p.active;
        audit('promo.toggle', 'PromoCode', `${p.active ? 'Activated' : 'Paused'} ${p.code}`, p.id);
        return p;
      },
      { write: true, latency: 200 },
    ),
  deletePromo: (id) =>
    mock(
      () => {
        requirePerm('marketing.manage');
        const p = db.promoCodes.find((x) => x.id === id) ?? notFound('Promo code');
        assert(p.usageCount === 0, 'Codes that have been used can’t be deleted — pause it instead.');
        db.promoCodes = db.promoCodes.filter((x) => x.id !== id);
        audit('promo.delete', 'PromoCode', `Deleted promo ${p.code}`, id, 'warning');
        return { ok: true as const };
      },
      { write: true },
    ),
  banners: () => mock(() => (requirePerm('marketing.manage'), [...db.banners].sort((a, b) => a.sortOrder - b.sortOrder))),
  saveBanner: (input, id) =>
    mock(
      () => {
        requirePerm('marketing.manage');
        assert(input.title.trim().length >= 3, 'Title is too short.');
        if (id) {
          const b = db.banners.find((x) => x.id === id) ?? notFound('Banner');
          Object.assign(b, input);
          audit('banner.update', 'Banner', `Updated banner “${b.title}”`, b.id);
          return b;
        }
        const b: Banner = { ...input, id: uid('bn'), clicks: 0, impressions: 0, sortOrder: db.banners.length + 1 };
        db.banners.push(b);
        audit('banner.create', 'Banner', `Created banner “${b.title}”`, b.id);
        return b;
      },
      { write: true },
    ),
  toggleBanner: (id) =>
    mock(
      () => {
        requirePerm('marketing.manage');
        const b = db.banners.find((x) => x.id === id) ?? notFound('Banner');
        b.active = !b.active;
        audit('banner.toggle', 'Banner', `${b.active ? 'Published' : 'Unpublished'} banner “${b.title}”`, b.id);
        return b;
      },
      { write: true, latency: 200 },
    ),
  deleteBanner: (id) =>
    mock(
      () => {
        requirePerm('marketing.manage');
        const b = db.banners.find((x) => x.id === id) ?? notFound('Banner');
        db.banners = db.banners.filter((x) => x.id !== id);
        audit('banner.delete', 'Banner', `Deleted banner “${b.title}”`, id, 'warning');
        return { ok: true as const };
      },
      { write: true },
    ),
  moveBanner: (id, dir) =>
    mock(
      () => {
        requirePerm('marketing.manage');
        const list = [...db.banners].sort((a, b) => a.sortOrder - b.sortOrder);
        const i = list.findIndex((b) => b.id === id);
        const j = i + dir;
        if (i >= 0 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
        list.forEach((b, k) => (b.sortOrder = k + 1));
        return list;
      },
      { write: true, latency: 150 },
    ),
  broadcasts: () => mock(() => (requirePerm('marketing.manage'), [...db.broadcasts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))),
  audienceSize: (audience, city) => mock(() => audienceCount(audience, city), { latency: 150 }),
  sendBroadcast: (input) =>
    mock(
      () => {
        requirePerm('marketing.manage');
        const me = currentAdmin();
        assert(input.title.trim().length >= 3, 'Title is too short.');
        assert(input.body.trim().length >= 5, 'Message is too short.');
        assert(input.channels.length > 0, 'Pick at least one channel.');
        if (input.scheduledFor) assert(new Date(input.scheduledFor).getTime() > Date.now(), 'Schedule time must be in the future.');
        const status: Broadcast['status'] = input.asDraft ? 'draft' : input.scheduledFor ? 'scheduled' : 'sent';
        const b: Broadcast = {
          id: uid('bc'),
          title: input.title.trim(),
          body: input.body.trim(),
          audience: input.audience,
          city: input.city,
          channels: input.channels,
          status,
          scheduledFor: input.scheduledFor,
          recipients: status === 'draft' ? 0 : audienceCount(input.audience, input.city),
          createdBy: me.name,
          createdAt: new Date().toISOString(),
        };
        db.broadcasts.unshift(b);
        audit('broadcast.' + status, 'Broadcast', `${status === 'sent' ? 'Sent' : status === 'scheduled' ? 'Scheduled' : 'Saved draft'} “${b.title}” to ${b.audience}${b.city ? ` in ${b.city}` : ''}`, b.id, status === 'sent' ? 'warning' : 'info');
        return b;
      },
      { write: true, latency: 800 },
    ),
  deleteBroadcast: (id) =>
    mock(
      () => {
        requirePerm('marketing.manage');
        const b = db.broadcasts.find((x) => x.id === id) ?? notFound('Broadcast');
        assert(b.status !== 'sent', 'Sent broadcasts can’t be deleted.');
        db.broadcasts = db.broadcasts.filter((x) => x.id !== id);
        audit('broadcast.delete', 'Broadcast', `Deleted ${b.status} “${b.title}”`, id);
        return { ok: true as const };
      },
      { write: true },
    ),
};

const httpImpl: MarketingApi = {
  promos: () => http('/promos'),
  savePromo: (input, id) => http(id ? `/promos/${id}` : '/promos', { method: id ? 'PUT' : 'POST', body: input }),
  togglePromo: (id) => http(`/promos/${id}/toggle`, { method: 'POST' }),
  deletePromo: (id) => http(`/promos/${id}`, { method: 'DELETE' }),
  banners: () => http('/banners'),
  saveBanner: (input, id) => http(id ? `/banners/${id}` : '/banners', { method: id ? 'PUT' : 'POST', body: input }),
  toggleBanner: (id) => http(`/banners/${id}/toggle`, { method: 'POST' }),
  deleteBanner: (id) => http(`/banners/${id}`, { method: 'DELETE' }),
  moveBanner: (id, dir) => http(`/banners/${id}/move`, { method: 'POST', body: { dir } }),
  broadcasts: () => http('/broadcasts'),
  audienceSize: (audience, city) => http('/broadcasts/audience', { query: { audience, city } }),
  sendBroadcast: (input) => http('/broadcasts', { method: 'POST', body: input }),
  deleteBroadcast: (id) => http(`/broadcasts/${id}`, { method: 'DELETE' }),
};

export const marketingApi: MarketingApi = env.useMocks ? mockImpl : httpImpl;
