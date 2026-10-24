import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SortDir } from '@/types/admin';
import { Checkbox } from './Form';
import { Skeleton } from './States';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Server sort key (with `onSort`) — or use `sortValue` for local sorting. */
  sortKey?: string;
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Hide the column in table mode below this breakpoint. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Phone card layout: 'title' = card heading, 'aside' = top-right, false = hidden. Default: shown as a labelled field. */
  mobile?: 'title' | 'aside' | false;
  width?: string;
}

interface Props<T> {
  data: T[] | undefined;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  fetching?: boolean;
  sort?: { key?: string; dir?: SortDir };
  onSort?: (key: string, dir: SortDir) => void;
  onRowClick?: (row: T) => void;
  selection?: { selected: string[]; onChange: (ids: string[]) => void; isSelectable?: (row: T) => boolean };
  empty?: ReactNode;
  footer?: ReactNode;
  caption: string;
  skeletonRows?: number;
  dense?: boolean;
  className?: string;
}

const hide = { sm: 'max-sm:hidden', md: 'max-md:hidden', lg: 'max-lg:hidden', xl: 'max-xl:hidden' };
const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' };

/**
 * Responsive data table: a real <table> from `md` up (sticky header, sortable
 * columns, selection) and stacked cards on phones — no horizontal page scroll.
 */
export function DataTable<T>({ data, columns, rowKey, loading, fetching, sort, onSort, onRowClick, selection, empty, footer, caption, skeletonRows = 6, dense, className }: Props<T>) {
  const [local, setLocal] = useState<{ key?: string; dir: SortDir }>({ dir: 'desc' });
  const active = onSort ? sort : local;

  const rows = useMemo(() => {
    if (onSort || !data || !local.key) return data ?? [];
    const col = columns.find((c) => c.key === local.key);
    if (!col?.sortValue) return data;
    const dir = local.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * dir;
    });
  }, [data, local, onSort, columns]);

  const toggleSort = (c: Column<T>) => {
    const key = onSort ? c.sortKey : c.sortValue ? c.key : undefined;
    if (!key) return;
    const dir: SortDir = active?.key === key && active.dir === 'desc' ? 'asc' : 'desc';
    if (onSort) onSort(key, dir);
    else setLocal({ key, dir });
  };

  const selectable = selection ? rows.filter((r) => selection.isSelectable?.(r) ?? true) : [];
  const allSelected = !!selection && selectable.length > 0 && selectable.every((r) => selection.selected.includes(rowKey(r)));
  const someSelected = !!selection && selection.selected.length > 0 && !allSelected;
  const toggleRow = (id: string, on: boolean) => selection?.onChange(on ? [...selection.selected, id] : selection.selected.filter((x) => x !== id));

  const titleCol = columns.find((c) => c.mobile === 'title') ?? columns[0];
  const asideCol = columns.find((c) => c.mobile === 'aside');
  const fieldCols = columns.filter((c) => c !== titleCol && c !== asideCol && c.mobile !== false);

  const isEmpty = !loading && rows.length === 0;
  const pad = dense ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className={cn('relative min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-card', className)}>
      {fetching && !loading ? <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-panel-soft"><div className="h-full w-1/3 animate-progress bg-panel" /></div> : null}

      {/* Table (md and up) */}
      <div className="max-md:hidden overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-base">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2/70">
              {selection ? (
                <th scope="col" className="w-10 pl-4">
                  <Checkbox label="Select all rows" checked={allSelected} indeterminate={someSelected} onChange={(on) => selection.onChange(on ? selectable.map(rowKey) : [])} />
                </th>
              ) : null}
              {columns.map((c) => {
                const sortable = onSort ? !!c.sortKey : !!c.sortValue;
                const sk = onSort ? c.sortKey : c.key;
                const isSorted = sortable && active?.key === sk;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={isSorted ? (active?.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn('whitespace-nowrap text-xs font-semibold text-ink-3', dense ? 'px-3 py-2' : 'px-4 py-2.5', alignCls[c.align ?? 'left'], c.hideBelow && hide[c.hideBelow])}
                  >
                    {sortable ? (
                      <button type="button" onClick={() => toggleSort(c)} className={cn('focus-ring inline-flex items-center gap-1 rounded hover:text-ink', isSorted && 'text-ink')}>
                        {c.header}
                        {isSorted ? active?.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-40" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {selection ? <td className="pl-4" /> : null}
                    {columns.map((c) => (
                      <td key={c.key} className={cn(pad, c.hideBelow && hide[c.hideBelow])}>
                        <Skeleton className="h-4 w-full max-w-36" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((r) => {
                  const id = rowKey(r);
                  const sel = selection?.selected.includes(id);
                  return (
                    <tr
                      key={id}
                      onClick={onRowClick ? () => onRowClick(r) : undefined}
                      onKeyDown={onRowClick ? (e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(r) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      className={cn('border-b border-line transition-colors last:border-0', onRowClick && 'cursor-pointer outline-none hover:bg-surface-2 focus-visible:bg-panel-soft', sel && 'bg-panel-soft/60')}
                    >
                      {selection ? (
                        <td className="pl-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox label="Select row" checked={!!sel} disabled={selection.isSelectable ? !selection.isSelectable(r) : false} onChange={(on) => toggleRow(id, on)} />
                        </td>
                      ) : null}
                      {columns.map((c) => (
                        <td key={c.key} className={cn(pad, 'align-middle text-ink-2', alignCls[c.align ?? 'left'], c.hideBelow && hide[c.hideBelow], c.className)}>
                          {c.cell(r)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Cards (phones) */}
      <ul className="md:hidden divide-y divide-line" aria-label={caption}>
        {loading
          ? Array.from({ length: Math.min(skeletonRows, 4) }, (_, i) => (
              <li key={i} className="flex flex-col gap-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </li>
            ))
          : rows.map((r) => {
              const id = rowKey(r);
              return (
                <li key={id} className={cn('flex gap-3 p-4', onRowClick && 'cursor-pointer active:bg-surface-2')} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {selection ? (
                    <span onClick={(e) => e.stopPropagation()} className="pt-0.5">
                      <Checkbox label="Select row" checked={selection.selected.includes(id)} disabled={selection.isSelectable ? !selection.isSelectable(r) : false} onChange={(on) => toggleRow(id, on)} />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">{titleCol.cell(r)}</div>
                      {asideCol ? <div className="shrink-0 text-right">{asideCol.cell(r)}</div> : null}
                    </div>
                    {fieldCols.length ? (
                      <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                        {fieldCols.map((c) => (
                          <div key={c.key} className="min-w-0">
                            <dt className="text-2xs font-medium text-ink-3">{c.header}</dt>
                            <dd className="truncate text-sm text-ink-2">{c.cell(r)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </li>
              );
            })}
      </ul>

      {isEmpty ? empty : null}
      {footer}
    </div>
  );
}
