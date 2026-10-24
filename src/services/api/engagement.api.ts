import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { uid } from '@/mocks/helpers';
import { TICKET_STATUS } from '@/lib/status';
import type { ListParams, Paginated } from '@/types/admin';
import type { CmsPage, Faq, Review, ReviewStatus, SupportTicket, TicketPriority, TicketStatus } from '@/types/models';
import { http } from '../http';
import { assert, audit, currentAdmin, mock, notFound, paginate, requirePerm } from '../mock/server';

export interface ReviewFilters extends Partial<ListParams> {
  status?: ReviewStatus | 'all';
  rating?: number;
  providerId?: string;
}
export interface TicketFilters extends Partial<ListParams> {
  status?: TicketStatus | 'all' | 'mine';
  priority?: TicketPriority;
  category?: SupportTicket['category'];
  role?: SupportTicket['userRole'];
}
export type FaqInput = Omit<Faq, 'id'>;

export interface EngagementApi {
  reviews(f: ReviewFilters): Promise<Paginated<Review> & { counts: Record<ReviewStatus | 'all', number>; avg: number; distribution: number[] }>;
  setReviewStatus(id: string, status: ReviewStatus): Promise<Review>;
  deleteReview(id: string): Promise<{ ok: true }>;
  tickets(f: TicketFilters): Promise<Paginated<SupportTicket> & { counts: Record<TicketStatus | 'all' | 'mine', number> }>;
  ticket(id: string): Promise<SupportTicket>;
  reply(id: string, text: string, internal: boolean): Promise<SupportTicket>;
  updateTicket(id: string, patch: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null }): Promise<SupportTicket>;
  faqs(): Promise<Faq[]>;
  saveFaq(input: FaqInput, id?: string): Promise<Faq>;
  deleteFaq(id: string): Promise<{ ok: true }>;
  pages(): Promise<CmsPage[]>;
  savePage(id: string, title: string, body: string): Promise<CmsPage>;
}

const mockImpl: EngagementApi = {
  reviews: (f) =>
    mock(() => {
      requirePerm('reviews.moderate');
      const base = db.reviews;
      const rows = base.filter((r) => (!f.status || f.status === 'all' || r.status === f.status) && (!f.rating || r.rating === f.rating) && (!f.providerId || r.providerId === f.providerId));
      const pub = base.filter((r) => r.status === 'published');
      return {
        ...paginate(rows, f, {
          search: (r) => `${r.comment} ${r.customerName} ${r.providerName} ${r.serviceTitle}`,
          sorters: { date: (r) => r.createdAt, rating: (r) => r.rating },
          defaultSort: 'date',
          defaultDir: 'desc',
        }),
        counts: { all: base.length, published: pub.length, hidden: base.filter((r) => r.status === 'hidden').length, flagged: base.filter((r) => r.status === 'flagged').length },
        avg: pub.length ? pub.reduce((s, r) => s + r.rating, 0) / pub.length : 0,
        distribution: [5, 4, 3, 2, 1].map((n) => pub.filter((r) => r.rating === n).length),
      };
    }),
  setReviewStatus: (id, status) =>
    mock(
      () => {
        requirePerm('reviews.moderate');
        const r = db.reviews.find((x) => x.id === id) ?? notFound('Review');
        r.status = status;
        if (status === 'published') r.flagReason = undefined;
        audit(`review.${status === 'published' ? 'publish' : 'hide'}`, 'Review', `${status === 'published' ? 'Published' : 'Hid'} ${r.rating}★ review on ${r.providerName}`, r.id);
        return r;
      },
      { write: true, latency: 250 },
    ),
  deleteReview: (id) =>
    mock(
      () => {
        requirePerm('reviews.moderate');
        const r = db.reviews.find((x) => x.id === id) ?? notFound('Review');
        db.reviews = db.reviews.filter((x) => x.id !== id);
        audit('review.delete', 'Review', `Deleted review by ${r.customerName} on ${r.providerName}`, id, 'warning');
        return { ok: true as const };
      },
      { write: true },
    ),
  tickets: (f) =>
    mock(() => {
      const me = requirePerm('support.view');
      const base = db.tickets.filter((t) => !f.role || t.userRole === f.role);
      const rows = base.filter(
        (t) =>
          (!f.status || f.status === 'all' || (f.status === 'mine' ? t.assigneeId === me.id && t.status !== 'closed' : t.status === f.status)) &&
          (!f.priority || t.priority === f.priority) &&
          (!f.category || t.category === f.category),
      );
      const counts = { all: base.length, mine: base.filter((t) => t.assigneeId === me.id && t.status !== 'closed').length } as Record<TicketStatus | 'all' | 'mine', number>;
      (Object.keys(TICKET_STATUS) as TicketStatus[]).forEach((s) => (counts[s] = base.filter((t) => t.status === s).length));
      const prio: Record<TicketPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      return {
        ...paginate(rows, f, {
          search: (t) => `${t.number} ${t.subject} ${t.userName}`,
          sorters: { updated: (t) => t.updatedAt, created: (t) => t.createdAt, priority: (t) => prio[t.priority] },
          defaultSort: 'updated',
          defaultDir: 'desc',
        }),
        counts,
      };
    }),
  ticket: (id) => mock(() => (requirePerm('support.view'), db.tickets.find((t) => t.id === id) ?? notFound('Ticket'))),
  reply: (id, text, internal) =>
    mock(
      () => {
        const me = requirePerm('support.manage');
        const t = db.tickets.find((x) => x.id === id) ?? notFound('Ticket');
        assert(text.trim().length >= 2, 'Message can’t be empty.');
        const at = new Date().toISOString();
        t.messages.push({ id: uid('m'), from: internal ? 'internal' : 'support', authorName: me.name, text: text.trim(), at });
        t.updatedAt = at;
        if (!internal && t.status === 'open') t.status = 'in_progress';
        if (!t.assigneeId) Object.assign(t, { assigneeId: me.id, assigneeName: me.name });
        return t;
      },
      { write: true },
    ),
  updateTicket: (id, patch) =>
    mock(
      () => {
        requirePerm('support.manage');
        const t = db.tickets.find((x) => x.id === id) ?? notFound('Ticket');
        if (patch.status) t.status = patch.status;
        if (patch.priority) t.priority = patch.priority;
        if (patch.assigneeId !== undefined) {
          const a = patch.assigneeId ? db.admins.find((x) => x.id === patch.assigneeId) : undefined;
          t.assigneeId = a?.id;
          t.assigneeName = a?.name;
        }
        t.updatedAt = new Date().toISOString();
        if (patch.status === 'resolved') audit('ticket.resolve', 'Ticket', `Resolved ${t.number}: ${t.subject}`, t.id);
        else audit('ticket.update', 'Ticket', `Updated ${t.number}`, t.id);
        return t;
      },
      { write: true },
    ),
  faqs: () => mock(() => (requirePerm('content.manage'), [...db.faqs].sort((a, b) => a.audience.localeCompare(b.audience) || a.sortOrder - b.sortOrder))),
  saveFaq: (input, id) =>
    mock(
      () => {
        requirePerm('content.manage');
        assert(input.question.trim().length >= 8, 'Question is too short.');
        assert(input.answer.trim().length >= 10, 'Answer is too short.');
        if (id) {
          const f = db.faqs.find((x) => x.id === id) ?? notFound('FAQ');
          Object.assign(f, input);
          audit('faq.update', 'Faq', `Updated FAQ “${f.question}”`, f.id);
          return f;
        }
        const f: Faq = { ...input, id: uid('faq') };
        db.faqs.push(f);
        audit('faq.create', 'Faq', `Added FAQ “${f.question}”`, f.id);
        return f;
      },
      { write: true },
    ),
  deleteFaq: (id) =>
    mock(
      () => {
        requirePerm('content.manage');
        db.faqs = db.faqs.filter((f) => f.id !== id);
        audit('faq.delete', 'Faq', 'Deleted FAQ', id, 'warning');
        return { ok: true as const };
      },
      { write: true },
    ),
  pages: () => mock(() => (requirePerm('content.manage'), db.cmsPages)),
  savePage: (id, title, body) =>
    mock(
      () => {
        requirePerm('content.manage');
        const me = currentAdmin();
        const p = db.cmsPages.find((x) => x.id === id) ?? notFound('Page');
        assert(body.trim().length >= 20, 'Page content is too short.');
        Object.assign(p, { title: title.trim(), body, updatedAt: new Date().toISOString(), updatedBy: me.name });
        audit('cms.update', 'CmsPage', `Published ${p.title}`, p.id, 'warning');
        return p;
      },
      { write: true },
    ),
};

const httpImpl: EngagementApi = {
  reviews: (f) => http('/reviews', { query: { ...f } }),
  setReviewStatus: (id, status) => http(`/reviews/${id}/status`, { method: 'PATCH', body: { status } }),
  deleteReview: (id) => http(`/reviews/${id}`, { method: 'DELETE' }),
  tickets: (f) => http('/tickets', { query: { ...f } }),
  ticket: (id) => http(`/tickets/${id}`),
  reply: (id, text, internal) => http(`/tickets/${id}/messages`, { method: 'POST', body: { text, internal } }),
  updateTicket: (id, patch) => http(`/tickets/${id}`, { method: 'PATCH', body: patch }),
  faqs: () => http('/content/faqs'),
  saveFaq: (input, id) => http(id ? `/content/faqs/${id}` : '/content/faqs', { method: id ? 'PUT' : 'POST', body: input }),
  deleteFaq: (id) => http(`/content/faqs/${id}`, { method: 'DELETE' }),
  pages: () => http('/content/pages'),
  savePage: (id, title, body) => http(`/content/pages/${id}`, { method: 'PUT', body: { title, body } }),
};

export const engagementApi: EngagementApi = env.useMocks ? mockImpl : httpImpl;
