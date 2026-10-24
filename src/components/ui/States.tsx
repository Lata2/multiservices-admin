import type { ReactNode } from 'react';
import { AlertCircle, Inbox, Loader2, RotateCw, type LucideIcon } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/services/http';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-shimmer rounded-lg bg-surface-3', className)} />;
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex text-panel', className)}>
      <Loader2 className="animate-spin" size={22} />
    </span>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading page">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="hidden h-9 w-28 sm:block" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-26" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function EmptyState({ icon: I = Inbox, title, description, action, className, compact }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14', className)}>
      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-panel-soft text-panel-ink">
        <I size={22} />
      </span>
      <div className="max-w-sm">
        <p className="text-md font-semibold text-ink">{title}</p>
        {description ? <p className="mt-1 text-sm text-ink-3">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, className, title = 'Couldn’t load this' }: { error: unknown; onRetry?: () => void; className?: string; title?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-500 dark:bg-danger-500/15">
        <AlertCircle size={22} />
      </span>
      <div className="max-w-sm">
        <p className="text-md font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-3">{errorMessage(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" icon={RotateCw} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Loading → error → content for a single query. */
export function QueryState<T>({ query, children, loading }: { query: UseQueryResult<T>; children: (data: T) => ReactNode; loading?: ReactNode }) {
  if (query.isPending) return <>{loading ?? <PageLoader />}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}
