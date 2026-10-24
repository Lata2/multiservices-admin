import { env } from '@/config/env';
import { db } from '@/mocks/db';
import { uid } from '@/mocks/helpers';
import type { ListParams, Paginated } from '@/types/admin';
import type { Category, Service } from '@/types/models';
import { ApiError, http } from '../http';
import { assert, audit, mock, notFound, paginate, requirePerm } from '../mock/server';

export type CategoryInput = Pick<Category, 'name' | 'icon' | 'parentId' | 'description' | 'active' | 'featured' | 'commissionRate' | 'sortOrder'>;
export type ServiceInput = Pick<Service, 'title' | 'description' | 'categoryId' | 'subcategoryId' | 'price' | 'discountPrice' | 'durationMin' | 'active' | 'requiresPickup' | 'includes' | 'excludes' | 'tags'>;

export interface CategoryNode extends Category {
  children: Category[];
  bookings: number;
  gmv: number;
}

export interface ServiceFilters extends Partial<ListParams> {
  categoryId?: string;
  providerId?: string;
  active?: 'active' | 'inactive';
}

export interface CatalogApi {
  categoryTree(): Promise<CategoryNode[]>;
  categories(): Promise<Category[]>;
  saveCategory(input: CategoryInput, id?: string): Promise<Category>;
  deleteCategory(id: string): Promise<{ ok: true }>;
  services(f: ServiceFilters): Promise<Paginated<Service>>;
  service(id: string): Promise<Service>;
  saveService(id: string, input: Partial<ServiceInput>): Promise<Service>;
  toggleService(id: string): Promise<Service>;
}

const mockImpl: CatalogApi = {
  categoryTree: () =>
    mock(() => {
      requirePerm('catalog.view');
      return db.categories
        .filter((c) => !c.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => {
          const bks = db.bookings.filter((b) => b.categoryId === c.id);
          return {
            ...c,
            children: db.categories.filter((x) => x.parentId === c.id).sort((a, b) => a.sortOrder - b.sortOrder),
            bookings: bks.length,
            gmv: bks.filter((b) => b.status === 'completed').reduce((s, b) => s + b.pricing.total, 0),
          };
        });
    }),
  categories: () => mock(() => db.categories, { latency: 120 }),
  saveCategory: (input, id) =>
    mock(
      () => {
        requirePerm('catalog.manage');
        const name = input.name.trim();
        assert(name.length >= 2, 'Name is too short.');
        assert(input.commissionRate >= 0 && input.commissionRate <= 50, 'Commission must be between 0 and 50%.');
        if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.parentId === (input.parentId ?? null) && c.id !== id))
          throw new ApiError('A category with this name already exists here.', 409, 'CONFLICT', { name: 'Already exists' });
        if (id) {
          const c = db.categories.find((x) => x.id === id) ?? notFound('Category');
          assert(input.parentId !== id, 'A category can’t be its own parent.');
          Object.assign(c, { ...input, name });
          if (!c.parentId) db.categories.filter((x) => x.parentId === c.id).forEach((x) => (x.commissionRate = c.commissionRate));
          audit('category.update', 'Category', `Updated category ${c.name}`, c.id);
          return c;
        }
        const c: Category = { ...input, name, parentId: input.parentId ?? null, id: uid('cat'), serviceCount: 0 };
        db.categories.push(c);
        audit('category.create', 'Category', `Created category ${c.name}`, c.id);
        return c;
      },
      { write: true },
    ),
  deleteCategory: (id) =>
    mock(
      () => {
        requirePerm('catalog.manage');
        const c = db.categories.find((x) => x.id === id) ?? notFound('Category');
        if (db.services.some((s) => s.categoryId === id || s.subcategoryId === id)) throw new ApiError('This category has services. Deactivate it instead.', 409);
        if (db.categories.some((x) => x.parentId === id)) throw new ApiError('Remove its sub-categories first.', 409);
        db.categories = db.categories.filter((x) => x.id !== id);
        audit('category.delete', 'Category', `Deleted category ${c.name}`, id, 'warning');
        return { ok: true as const };
      },
      { write: true },
    ),
  services: (f) =>
    mock(() => {
      requirePerm('catalog.view');
      const rows = db.services.filter(
        (s) => (!f.categoryId || s.categoryId === f.categoryId || s.subcategoryId === f.categoryId) && (!f.providerId || s.providerId === f.providerId) && (!f.active || (f.active === 'active') === s.active),
      );
      return paginate(rows, f, {
        search: (s) => `${s.title} ${s.providerName}`,
        sorters: { title: (s) => s.title, price: (s) => s.discountPrice ?? s.price, rating: (s) => s.rating, bookings: (s) => s.bookings, created: (s) => s.createdAt },
        defaultSort: 'bookings',
        defaultDir: 'desc',
      });
    }),
  service: (id) => mock(() => (requirePerm('catalog.view'), db.services.find((s) => s.id === id) ?? notFound('Service'))),
  saveService: (id, input) =>
    mock(
      () => {
        requirePerm('catalog.manage');
        const s = db.services.find((x) => x.id === id) ?? notFound('Service');
        const price = input.price ?? s.price;
        const discount = input.discountPrice === undefined ? s.discountPrice : input.discountPrice || undefined;
        assert(price > 0, 'Price must be greater than zero.');
        if (discount) assert(discount < price, 'Offer price must be lower than the list price.');
        Object.assign(s, input, { discountPrice: discount });
        audit('service.update', 'Service', `Updated service ${s.title} (${s.providerName})`, s.id);
        return s;
      },
      { write: true },
    ),
  toggleService: (id) =>
    mock(
      () => {
        requirePerm('catalog.manage');
        const s = db.services.find((x) => x.id === id) ?? notFound('Service');
        const p = db.providers.find((x) => x.id === s.providerId);
        if (!s.active) assert(p?.status === 'approved', 'The provider is not approved — services can’t go live.');
        s.active = !s.active;
        audit('service.toggle', 'Service', `${s.active ? 'Activated' : 'Deactivated'} ${s.title}`, s.id);
        return s;
      },
      { write: true },
    ),
};

const httpImpl: CatalogApi = {
  categoryTree: () => http('/categories/tree'),
  categories: () => http('/categories'),
  saveCategory: (input, id) => http(id ? `/categories/${id}` : '/categories', { method: id ? 'PUT' : 'POST', body: input }),
  deleteCategory: (id) => http(`/categories/${id}`, { method: 'DELETE' }),
  services: (f) => http('/services', { query: { ...f } }),
  service: (id) => http(`/services/${id}`),
  saveService: (id, input) => http(`/services/${id}`, { method: 'PATCH', body: input }),
  toggleService: (id) => http(`/services/${id}/toggle`, { method: 'POST' }),
};

export const catalogApi: CatalogApi = env.useMocks ? mockImpl : httpImpl;
