import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { ListParams, SortDir } from '@/types/admin';

/**
 * URL-backed table state (page, size, search, sort and any filters) so every
 * list view is bookmarkable/shareable and survives reloads.
 */
export function useTableState<F extends Record<string, string | undefined>>(defaults: { pageSize?: number; sort?: string; dir?: SortDir } & Partial<F> = {}) {
  const [sp, setSp] = useSearchParams();

  const params = useMemo(() => {
    const out: Record<string, string | number | undefined> = {
      page: Number(sp.get('page') ?? 1) || 1,
      pageSize: Number(sp.get('size') ?? defaults.pageSize ?? 10) || 10,
      search: sp.get('q') ?? undefined,
      sort: sp.get('sort') ?? defaults.sort,
      dir: (sp.get('dir') as SortDir | null) ?? defaults.dir,
    };
    sp.forEach((v, k) => {
      if (!['page', 'size', 'q', 'sort', 'dir'].includes(k)) out[k] = v;
    });
    for (const [k, v] of Object.entries(defaults)) if (out[k] === undefined && !['pageSize', 'sort', 'dir'].includes(k)) out[k] = v as string;
    return out as unknown as ListParams & F;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const update = useCallback(
    (patch: Record<string, string | number | undefined | null>, resetPage = true) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            const key = k === 'pageSize' ? 'size' : k === 'search' ? 'q' : k;
            if (v === undefined || v === null || v === '' || v === 'all') next.delete(key);
            else next.set(key, String(v));
          }
          if (resetPage && !('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );

  return {
    params,
    setFilter: (key: keyof F & string, value: string | undefined) => update({ [key]: value }),
    setFilters: (patch: Partial<F>) => update(patch as Record<string, string | undefined>),
    /** Update URL params without resetting the page (e.g. open a detail drawer). */
    setQuery: (patch: Record<string, string | undefined>) => update(patch, false),
    setPage: (page: number) => update({ page: page <= 1 ? undefined : page }, false),
    setPageSize: (size: number) => update({ pageSize: size }),
    setSearch: (q: string) => update({ search: q || undefined }),
    setSort: (sort: string, dir: SortDir) => update({ sort, dir }, false),
    reset: () => setSp(new URLSearchParams(), { replace: true }),
    activeFilterCount: [...sp.keys()].filter((k) => !['page', 'size', 'sort', 'dir', 'q', 'status', 'tab'].includes(k)).length,
  };
}
