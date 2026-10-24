import type { ListParams, Paginated } from '@/types/admin';

/** Pulls every page of a list endpoint (for CSV exports). Capped for safety. */
export async function fetchAll<T, F extends Partial<ListParams>>(fn: (f: F) => Promise<Paginated<T>>, filters: F, max = 2000): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const r = await fn({ ...filters, page, pageSize: 100 });
    out.push(...r.items);
    if (page >= r.pageCount || out.length >= max) break;
    page += 1;
  }
  return out;
}
