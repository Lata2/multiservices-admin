import { useState } from 'react';
import { Bell, Mail, Megaphone, MessageSquare, Save, Send, Trash2, Users } from 'lucide-react';
import { CitySelect } from '@/components/domain';
import { Badge, Button, Card, CardHeader, ChipGroup, ConfirmDialog, DataTable, EmptyState, ErrorState, IconButton, Input, PageHeader, Segmented, Switch, Textarea } from '@/components/ui';
import { useAudienceSize, useBroadcasts } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';

import { formatDateTime, formatNumber, formatPercent, titleCase } from '@/lib/format';
import { marketingApi } from '@/services/api';
import type { Audience, Broadcast, Channel } from '@/types/admin';

const inv = [qk.marketing.broadcasts, qk.platform.auditAll];
const AUDIENCE: { value: Audience; label: string }[] = [
  { value: 'customer', label: 'Customers' },
  { value: 'provider', label: 'Providers' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'all', label: 'Everyone' },
];
const STATUS_TONE = { sent: 'success', scheduled: 'info', draft: 'neutral' } as const;

export default function BroadcastsPage() {
  const q = useBroadcasts();
  const [audience, setAudience] = useState<Audience>('customer');
  const [city, setCity] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['push']);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState<Broadcast | null>(null);
  const reach = useAudienceSize(audience, city || null);
  const reset = () => (setTitle(''), setBody(''), setSchedule(false), setWhen(''), setTouched(false), setConfirm(false));
  const send = useApiMutation((asDraft: boolean) => marketingApi.sendBroadcast({ title, body, audience, city: city || null, channels, scheduledFor: schedule && when ? new Date(when).toISOString() : undefined, asDraft }), {
    invalidate: inv,
    success: (b) => (b.status === 'sent' ? `Sent to ${formatNumber(b.recipients)} people` : b.status === 'scheduled' ? 'Broadcast scheduled' : 'Draft saved'),
    onSuccess: reset,
  });
  const del = useApiMutation((id: string) => marketingApi.deleteBroadcast(id), { invalidate: inv, success: 'Broadcast deleted', onSuccess: () => setDeleting(null) });

  const errors = {
    title: title.trim().length < 3 ? 'At least 3 characters' : undefined,
    body: body.trim().length < 5 ? 'Write a short message' : body.length > 240 ? 'Max 240 characters' : undefined,
    channels: channels.length ? undefined : 'Pick at least one channel',
    when: schedule && (!when || new Date(when).getTime() <= Date.now()) ? 'Pick a future time' : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  return (
    <>
      <PageHeader title="Broadcasts" description="Send push, SMS or email announcements to app users." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title="New broadcast" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="mb-1.5 text-sm font-semibold text-ink-2">Audience</p>
                <Segmented label="Audience" value={audience} onChange={setAudience} options={AUDIENCE} />
              </div>
              <CitySelect label="City" value={city} onChange={(e) => setCity(e.target.value)} containerClassName="sm:w-44" />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink-2">Channels</p>
              <ChipGroup label="Channels" value={channels} onChange={setChannels} options={[{ value: 'push', label: 'Push' }, { value: 'sms', label: 'SMS' }, { value: 'email', label: 'Email' }]} />
              {touched && errors.channels ? <p className="mt-1 text-xs text-danger-600">{errors.channels}</p> : null}
            </div>
            <Input label="Title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} error={touched ? errors.title : undefined} placeholder="e.g. Weekend deal: 20% off cleaning" />
            <Textarea label="Message" rows={3} value={body} onChange={(e) => setBody(e.target.value)} error={touched ? errors.body : undefined} hint={`${body.length}/240`} placeholder="Keep it short and specific." />
            <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
                <Switch size="sm" label="Schedule for later" checked={schedule} onChange={setSchedule} /> Schedule for later
              </label>
              {schedule ? <Input aria-label="Send at" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} error={touched ? errors.when : undefined} containerClassName="sm:ml-auto sm:w-60" className="h-8.5 text-sm" /> : null}
            </div>
            <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-sm text-ink-2">
                <Users size={15} className="text-ink-3" /> Estimated reach <b className="tabular text-ink">{reach.data !== undefined ? formatNumber(reach.data) : '…'}</b>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" icon={Save} disabled={title.trim().length < 3} loading={send.isPending && send.variables === true} onClick={() => send.mutate(true)}>
                  Save draft
                </Button>
                <Button variant="panel" icon={Send} onClick={() => (setTouched(true), valid && setConfirm(true))}>
                  {schedule ? 'Schedule' : 'Send now'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col items-center">
          <p className="mb-3 self-start text-sm font-semibold text-ink-2">Preview</p>
          <div className="w-full max-w-[280px] rounded-[2rem] border-[6px] border-neutral-800 bg-gradient-to-b from-primary-700 to-highlight-700 p-3 pt-6 shadow-lg">
            <p className="mb-4 text-center text-2xl font-semibold tabular text-white/90">{new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
            {channels.includes('push') ? (
              <div className="animate-pop-in rounded-2xl bg-white/90 p-3 text-neutral-900 shadow-md backdrop-blur">
                <p className="flex items-center justify-between text-2xs font-semibold text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Bell size={11} /> SERVIO
                  </span>
                  now
                </p>
                <p className="mt-1 text-sm font-bold">{title || 'Your title'}</p>
                <p className="text-xs text-neutral-600">{body || 'Your message appears here.'}</p>
              </div>
            ) : null}
            {channels.includes('sms') ? (
              <div className="mt-2 rounded-2xl bg-white/90 p-3 text-xs text-neutral-800">
                <p className="mb-0.5 flex items-center gap-1 text-2xs font-semibold text-neutral-500">
                  <MessageSquare size={11} /> SMS from SERVIO
                </p>
                {title ? `${title}: ` : ''}
                {body || '…'}
              </div>
            ) : null}
            {channels.includes('email') ? (
              <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white/90 p-3 text-xs text-neutral-800">
                <Mail size={13} className="shrink-0 text-neutral-500" />
                <span className="truncate font-semibold">{title || 'Email subject'}</span>
              </div>
            ) : null}
            <div className="h-24" />
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-7 text-lg font-bold text-ink">History</h2>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Broadcast history"
          data={q.data}
          loading={q.isPending}
          rowKey={(b) => b.id}
          empty={<EmptyState icon={Megaphone} title="No broadcasts yet" />}
          columns={[
            { key: 't', header: 'Message', mobile: 'title', cell: (b) => <span className="block min-w-0"><span className="block max-w-80 truncate font-semibold text-ink">{b.title}</span><span className="block max-w-80 truncate text-xs text-ink-3">{b.body}</span></span> },
            { key: 'a', header: 'Audience', cell: (b) => <span className="whitespace-nowrap">{titleCase(b.audience === 'all' ? 'everyone' : b.audience)}{b.city ? `, ${b.city}` : ''}</span> },
            { key: 'c', header: 'Channels', hideBelow: 'lg', cell: (b) => <span className="flex gap-1">{b.channels.map((c) => <Badge key={c} size="xs">{c.toUpperCase()}</Badge>)}</span> },
            { key: 'r', header: 'Reach', align: 'right', sortValue: (b) => b.recipients, cell: (b) => <span className="tabular">{b.recipients ? formatNumber(b.recipients) : '—'}</span> },
            { key: 'o', header: 'Opened', align: 'right', hideBelow: 'lg', cell: (b) => (b.openRate ? formatPercent(b.openRate) : '—') },
            { key: 'd', header: 'When', hideBelow: 'md', sortValue: (b) => b.scheduledFor ?? b.createdAt, cell: (b) => <span className="whitespace-nowrap text-sm">{formatDateTime(b.scheduledFor ?? b.createdAt)}<span className="block text-xs text-ink-3">by {b.createdBy}</span></span> },
            { key: 's', header: 'Status', mobile: 'aside', cell: (b) => <Badge tone={STATUS_TONE[b.status]} dot size="xs">{titleCase(b.status)}</Badge> },
            { key: 'x', header: <span className="sr-only">Delete</span>, align: 'right', mobile: false, cell: (b) => (b.status !== 'sent' ? <IconButton icon={Trash2} label="Delete" size="sm" variant="danger" onClick={() => setDeleting(b)} /> : null) },
          ]}
        />
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => send.mutate(false)}
        loading={send.isPending && send.variables === false}
        icon={Send}
        title={schedule ? 'Schedule broadcast?' : 'Send broadcast now?'}
        confirmLabel={schedule ? 'Schedule' : `Send to ${formatNumber(reach.data ?? 0)}`}
        message={
          <span>
            “{title}” goes to <b>{AUDIENCE.find((a) => a.value === audience)?.label.toLowerCase()}</b>
            {city ? ` in ${city}` : ''} by {channels.join(', ')}
            {schedule && when ? ` on ${formatDateTime(when)}` : ''}. This can’t be recalled once sent.
          </span>
        }
      />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} loading={del.isPending} tone="danger" icon={Trash2} title={`Delete ${deleting?.status}?`} confirmLabel="Delete" message={`“${deleting?.title}”`} />
    </>
  );
}

