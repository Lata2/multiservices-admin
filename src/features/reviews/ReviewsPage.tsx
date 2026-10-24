import { useState } from 'react';
import { Eye, EyeOff, Flag, MessageSquareQuote, Star, Trash2 } from 'lucide-react';
import { TablePager } from '@/components/domain/ListKit';
import { Avatar, Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, ProgressBar, SearchInput, Select, Skeleton, StatusBadge, Tabs, Toolbar } from '@/components/ui';
import { useReviews } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { REVIEW_STATUS } from '@/lib/status';
import { engagementApi } from '@/services/api';
import type { ReviewFilters } from '@/services/api/engagement.api';
import type { Review, ReviewStatus } from '@/types/models';

type F = { status?: string; rating?: string };
const inv = [qk.reviews.all, qk.dashboard.admin];

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= n ? 'fill-warning-400 text-warning-400' : 'text-line-strong'} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const t = useTableState<F>({ pageSize: 10, sort: 'date', dir: 'desc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const q = useReviews({ ...params, rating: params.rating ? Number(params.rating) : undefined } as unknown as ReviewFilters);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const set = useApiMutation((v: { id: string; status: ReviewStatus }) => engagementApi.setReviewStatus(v.id, v.status), { invalidate: inv, success: (r) => (r.status === 'published' ? 'Review published' : 'Review hidden') });
  const del = useApiMutation((id: string) => engagementApi.deleteReview(id), { invalidate: inv, success: 'Review deleted', onSuccess: () => setDeleting(null) });
  const d = q.data;
  const totalPub = d?.distribution.reduce((a, b) => a + b, 0) || 1;

  return (
    <>
      <PageHeader title="Reviews" description="Moderate customer ratings. Flagged reviews were reported or caught by filters." />
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit">
          {d ? (
            <>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tabular text-ink">{d.avg.toFixed(2)}</span>
                <span className="mb-1.5">
                  <Stars n={Math.round(d.avg)} />
                </span>
              </div>
              <p className="text-sm text-ink-3">{d.counts.published} published reviews</p>
              <ul className="mt-4 flex flex-col gap-2">
                {d.distribution.map((n, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => t.setFilter('rating', params.rating === String(5 - i) ? undefined : String(5 - i))} className={cn('focus-ring flex w-full items-center gap-2 rounded-md text-sm', params.rating === String(5 - i) && 'font-semibold')}>
                      <span className="w-6 text-ink-2">{5 - i}★</span>
                      <ProgressBar value={n / totalPub} tone={5 - i >= 4 ? 'success' : 5 - i === 3 ? 'warning' : 'danger'} className="flex-1" label={`${5 - i} stars`} />
                      <span className="w-8 text-right tabular text-ink-3">{n}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Skeleton className="h-48" />
          )}
        </Card>
        <div className="min-w-0">
          <Tabs
            label="Review status"
            className="mb-3"
            value={params.status ?? 'all'}
            onChange={(v) => t.setFilter('status', v)}
            tabs={[
              { value: 'all', label: 'All', count: d?.counts.all },
              { value: 'flagged', label: 'Flagged', count: d?.counts.flagged },
              { value: 'published', label: 'Published', count: d?.counts.published },
              { value: 'hidden', label: 'Hidden', count: d?.counts.hidden },
            ]}
          />
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search text, customer, provider…" className="sm:w-72" />
            <Select aria-label="Rating" compact placeholder="Any rating" value={params.rating ?? ''} onChange={(e) => t.setFilter('rating', e.target.value)} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} stars` }))} containerClassName="sm:w-32" />
          </Toolbar>
          {q.isError ? (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          ) : (
            <Card padded={false}>
              {q.isPending ? (
                <div className="flex flex-col gap-3 p-4">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : d?.items.length ? (
                <ul className="divide-y divide-line">
                  {d.items.map((r) => (
                    <li key={r.id} className={cn('flex flex-col gap-3 p-4 sm:flex-row', r.status === 'flagged' && 'bg-danger-50/50 dark:bg-danger-500/5')}>
                      <Avatar name={r.customerName} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-ink">{r.customerName}</span>
                          <Stars n={r.rating} />
                          <StatusBadge map={REVIEW_STATUS} value={r.status} size="xs" />
                          <span className="text-xs text-ink-3">{timeAgo(r.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-3">
                          {r.serviceTitle} by {r.providerName}
                        </p>
                        <p className="mt-2 text-base text-ink-2">{r.comment}</p>
                        {r.flagReason ? (
                          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-danger-600 dark:text-danger-400">
                            <Flag size={12} /> {r.flagReason}
                          </p>
                        ) : null}
                        {r.reply ? <p className="mt-2 rounded-lg border-l-2 border-panel bg-surface-2 px-3 py-2 text-sm text-ink-2"><b className="text-ink">Provider replied:</b> {r.reply.text}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-1.5 sm:flex-col">
                        {r.status !== 'published' ? (
                          <Button size="xs" variant="soft" icon={Eye} onClick={() => set.mutate({ id: r.id, status: 'published' })}>
                            Publish
                          </Button>
                        ) : (
                          <Button size="xs" variant="subtle" icon={EyeOff} onClick={() => set.mutate({ id: r.id, status: 'hidden' })}>
                            Hide
                          </Button>
                        )}
                        <Button size="xs" variant="ghost" icon={Trash2} className="text-danger-600" onClick={() => setDeleting(r)}>
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={MessageSquareQuote} title="No reviews match" />
              )}
              <TablePager data={d} onPage={t.setPage} onPageSize={t.setPageSize} />
            </Card>
          )}
        </div>
      </div>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} loading={del.isPending} tone="danger" icon={Trash2} title="Delete review permanently?" confirmLabel="Delete" message="Prefer hiding unless the review is spam or abusive — deletion can’t be undone." />
    </>
  );
}
