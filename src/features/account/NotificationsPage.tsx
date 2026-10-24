import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { BellOff, CalendarCheck2, CheckCheck, LifeBuoy, ServerCog, Star, UserCheck, Wallet, type LucideIcon } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from '@/components/ui';
import { toneClasses, type Tone } from '@/config/theme';
import { useNotifications } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { usePanel } from '@/hooks/useAccess';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import { insightsApi } from '@/services/api';
import type { NotificationKind } from '@/types/admin';

const KIND: Record<NotificationKind, { icon: LucideIcon; tone: Tone }> = {
  approval: { icon: UserCheck, tone: 'warning' },
  payout: { icon: Wallet, tone: 'success' },
  ticket: { icon: LifeBuoy, tone: 'danger' },
  booking: { icon: CalendarCheck2, tone: 'primary' },
  system: { icon: ServerCog, tone: 'highlight' },
  review: { icon: Star, tone: 'accent' },
};

export default function NotificationsPage() {
  const q = useNotifications();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { to } = usePanel();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const list = (q.data ?? []).filter((n) => filter === 'all' || !n.read);
  const unread = (q.data ?? []).filter((n) => !n.read).length;
  const mark = async (id: string | 'all') => {
    await insightsApi.markRead(id);
    await qc.invalidateQueries({ queryKey: qk.notifications });
  };
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Alerts for work that needs an admin."
        actions={
          <Button variant="outline" size="sm" icon={CheckCheck} disabled={!unread} onClick={() => mark('all')}>
            Mark all read
          </Button>
        }
      />
      <Segmented className="mb-3" label="Filter" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All', count: q.data?.length }, { value: 'unread', label: 'Unread', count: unread }]} />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <Skeleton className="h-80" />
      ) : list.length ? (
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {list.map((n) => {
              const k = KIND[n.kind];
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!n.read) await mark(n.id);
                      if (n.href) {
                        const [path, query] = n.href.split('?');
                        navigate(to(path) + (query ? `?${query}` : ''));
                      }
                    }}
                    className={cn('flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-surface-2', !n.read && 'bg-panel-soft/40')}
                  >
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClasses[k.tone].soft)}>
                      <k.icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn('text-base', n.read ? 'font-medium text-ink-2' : 'font-semibold text-ink')}>{n.title}</span>
                        <span className="shrink-0 text-xs text-ink-3">{timeAgo(n.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-3">{n.body}</span>
                    </span>
                    {!n.read ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-panel" aria-label="Unread" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={BellOff} title={filter === 'unread' ? 'No unread notifications' : 'No notifications'} />
        </Card>
      )}
    </div>
  );
}
