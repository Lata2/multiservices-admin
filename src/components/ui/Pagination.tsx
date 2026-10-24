import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

function pages(current: number, count: number): (number | '…')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(count - 1, current + 1);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 1) out.push('…');
  out.push(count);
  return out;
}

export function Pagination({ page, pageCount, total, pageSize, onPage, onPageSize, className }: { page: number; pageCount: number; total: number; pageSize: number; onPage: (p: number) => void; onPageSize?: (s: number) => void; className?: string }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = 'focus-ring inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-35';
  return (
    <nav aria-label="Pagination" className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3', className)}>
      <div className="flex items-center gap-3 text-sm text-ink-3">
        <span className="tabular">
          {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
        </span>
        {onPageSize ? (
          <label className="hidden items-center gap-1.5 sm:flex">
            <span>Rows</span>
            <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="h-7 rounded-md border border-line bg-surface px-1.5 text-sm text-ink focus-ring">
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={cn(btn, 'text-ink-2 hover:bg-surface-3')} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <span className="flex items-center gap-1 max-sm:hidden">
          {pages(page, pageCount).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1 text-ink-3">
                …
              </span>
            ) : (
              <button key={p} type="button" aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)} className={cn(btn, p === page ? 'bg-panel-soft text-panel-ink' : 'text-ink-2 hover:bg-surface-3')}>
                {p}
              </button>
            ),
          )}
        </span>
        <span className="px-2 text-sm font-semibold text-ink-2 sm:hidden">
          {page} / {pageCount}
        </span>
        <button type="button" className={cn(btn, 'text-ink-2 hover:bg-surface-3')} disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
