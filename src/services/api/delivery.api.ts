import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { PROVIDER_STATUS, TASK_STATUS } from '@/lib/status';
import type { ListParams, Paginated } from '@/types/admin';
import type { DeliveryPartner, DeliveryTask, DeliveryTaskStatus, ProviderStatus } from '@/types/models';
import { http } from '../http';
import { assert, audit, inScope, mock, notFound, paginate, requirePerm, scopeCities } from '../mock/server';

export interface PartnerFilters extends Partial<ListParams> {
  status?: ProviderStatus | 'all';
  city?: string;
  online?: 'online' | 'offline';
}
export interface TaskFilters extends Partial<ListParams> {
  status?: DeliveryTaskStatus | 'all';
  city?: string;
  partnerId?: string;
  type?: DeliveryTask['type'];
}

export interface DeliveryApi {
  partners(f: PartnerFilters): Promise<Paginated<DeliveryPartner> & { counts: Record<ProviderStatus | 'all' | 'online', number> }>;
  partner(id: string): Promise<{ partner: DeliveryPartner; tasks: DeliveryTask[] }>;
  setPartnerStatus(id: string, status: ProviderStatus, note?: string): Promise<DeliveryPartner>;
  tasks(f: TaskFilters): Promise<Paginated<DeliveryTask> & { counts: Record<DeliveryTaskStatus | 'all', number> }>;
  task(id: string): Promise<DeliveryTask>;
  assign(taskId: string, partnerId: string): Promise<DeliveryTask>;
  unassign(taskId: string): Promise<DeliveryTask>;
  cancelTask(taskId: string, reason: string): Promise<DeliveryTask>;
}

const findTask = (id: string) => {
  const t = db.deliveryTasks.find((x) => x.id === id) ?? notFound('Task');
  if (!inScope(t.city)) notFound('Task');
  return t;
};

const mockImpl: DeliveryApi = {
  partners: (f) =>
    mock(() => {
      requirePerm('partners.view', 'deliveries.manage');
      const scope = scopeCities();
      const base = db.partners.filter((p) => inScope(p.city, scope));
      const rows = base.filter((p) => (!f.status || f.status === 'all' || p.status === f.status) && (!f.city || p.city === f.city) && (!f.online || (f.online === 'online') === p.online));
      const counts = { all: base.length, online: base.filter((p) => p.online).length } as Record<ProviderStatus | 'all' | 'online', number>;
      (Object.keys(PROVIDER_STATUS) as ProviderStatus[]).forEach((s) => (counts[s] = base.filter((p) => p.status === s).length));
      return {
        ...paginate(rows, f, {
          search: (p) => `${p.name} ${p.phone} ${p.vehicleNumber}`,
          sorters: { name: (p) => p.name, rating: (p) => p.rating, tasks: (p) => p.completedTasks, joined: (p) => p.joinedAt, earnings: (p) => p.earnings },
          defaultSort: 'joined',
          defaultDir: 'desc',
        }),
        counts,
      };
    }),
  partner: (id) =>
    mock(() => {
      requirePerm('partners.view');
      const partner = db.partners.find((p) => p.id === id) ?? notFound('Partner');
      if (!inScope(partner.city)) notFound('Partner');
      return { partner, tasks: db.deliveryTasks.filter((t) => t.partnerId === id).sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor)).slice(0, 12) };
    }),
  setPartnerStatus: (id, status, note) =>
    mock(
      () => {
        requirePerm('partners.manage');
        const p = db.partners.find((x) => x.id === id) ?? notFound('Partner');
        if (status === 'rejected' || status === 'suspended') assert((note ?? '').trim().length >= 5, 'Add a short reason — it is shared with the partner.');
        p.status = status;
        if (status !== 'approved') {
          p.online = false;
          db.deliveryTasks.filter((t) => t.partnerId === id && t.status === 'accepted').forEach((t) => Object.assign(t, { status: 'available', partnerId: undefined, partnerName: undefined }));
        }
        audit(`partner.${status}`, 'DeliveryPartner', `${PROVIDER_STATUS[status].label}: ${p.name}${note ? ` — ${note}` : ''}`, p.id, status === 'approved' ? 'info' : 'warning');
        return p;
      },
      { write: true },
    ),
  tasks: (f) =>
    mock(() => {
      requirePerm('deliveries.view');
      const scope = scopeCities();
      const base = db.deliveryTasks.filter((t) => inScope(t.city, scope));
      const rows = base.filter((t) => (!f.status || f.status === 'all' || t.status === f.status) && (!f.city || t.city === f.city) && (!f.partnerId || t.partnerId === f.partnerId) && (!f.type || t.type === f.type));
      const counts = { all: base.length } as Record<DeliveryTaskStatus | 'all', number>;
      (Object.keys(TASK_STATUS) as DeliveryTaskStatus[]).forEach((s) => (counts[s] = base.filter((t) => t.status === s).length));
      return {
        ...paginate(rows, f, {
          search: (t) => `${t.bookingCode} ${t.pickup.name} ${t.drop.name} ${t.partnerName ?? ''} ${t.itemsSummary}`,
          sorters: { scheduled: (t) => t.scheduledFor, fee: (t) => t.fee, distance: (t) => t.distanceKm, updated: (t) => t.updatedAt },
          defaultSort: 'scheduled',
          defaultDir: 'desc',
        }),
        counts,
      };
    }),
  task: (id) => mock(() => (requirePerm('deliveries.view'), findTask(id))),
  assign: (taskId, partnerId) =>
    mock(
      () => {
        requirePerm('deliveries.manage');
        const t = findTask(taskId);
        assert(['available', 'accepted'].includes(t.status), 'Only unassigned or assigned (not picked up) tasks can be dispatched.');
        const p = db.partners.find((x) => x.id === partnerId) ?? notFound('Partner');
        assert(p.status === 'approved', `${p.name} is not an approved partner.`);
        assert(p.city === t.city, `${p.name} works in ${p.city}, but this task is in ${t.city}.`);
        t.status = 'accepted';
        t.partnerId = p.id;
        t.partnerName = p.name;
        t.updatedAt = new Date().toISOString();
        audit('delivery.assign', 'DeliveryTask', `Assigned ${t.bookingCode} (${t.type}) to ${p.name}`, t.id);
        return t;
      },
      { write: true },
    ),
  unassign: (taskId) =>
    mock(
      () => {
        requirePerm('deliveries.manage');
        const t = findTask(taskId);
        assert(t.status === 'accepted', 'Only assigned tasks that are not yet picked up can be unassigned.');
        const name = t.partnerName;
        Object.assign(t, { status: 'available', partnerId: undefined, partnerName: undefined, updatedAt: new Date().toISOString() });
        audit('delivery.unassign', 'DeliveryTask', `Unassigned ${name} from ${t.bookingCode}`, t.id);
        return t;
      },
      { write: true },
    ),
  cancelTask: (taskId, reason) =>
    mock(
      () => {
        requirePerm('deliveries.manage');
        const t = findTask(taskId);
        assert(!['delivered', 'cancelled'].includes(t.status), 'This task is already closed.');
        assert(reason.trim().length >= 3, 'Please give a reason.');
        t.status = 'cancelled';
        t.updatedAt = new Date().toISOString();
        audit('delivery.cancel', 'DeliveryTask', `Cancelled task for ${t.bookingCode}: ${reason}`, t.id, 'warning');
        return t;
      },
      { write: true },
    ),
};

const httpImpl: DeliveryApi = {
  partners: (f) => http('/delivery-partners', { query: { ...f } }),
  partner: (id) => http(`/delivery-partners/${id}`),
  setPartnerStatus: (id, status, note) => http(`/delivery-partners/${id}/status`, { method: 'PATCH', body: { status, note } }),
  tasks: (f) => http('/delivery-tasks', { query: { ...f } }),
  task: (id) => http(`/delivery-tasks/${id}`),
  assign: (taskId, partnerId) => http(`/delivery-tasks/${taskId}/assign`, { method: 'POST', body: { partnerId } }),
  unassign: (taskId) => http(`/delivery-tasks/${taskId}/assign`, { method: 'DELETE' }),
  cancelTask: (taskId, reason) => http(`/delivery-tasks/${taskId}/cancel`, { method: 'POST', body: { reason } }),
};

export const deliveryApi: DeliveryApi = env.useMocks ? mockImpl : httpImpl;
