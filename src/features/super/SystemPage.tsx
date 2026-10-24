import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Apple, Construction, Database, Flag, Pencil, RotateCcw, Smartphone } from 'lucide-react';
import { Sparkline } from '@/components/charts';
import { Badge, Button, Callout, Card, CardHeader, ConfirmDialog, DataTable, Dialog, ErrorState, IconButton, Input, PageHeader, PageLoader, StatusBadge, Switch, Textarea } from '@/components/ui';
import { useSystem } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { cn } from '@/lib/cn';
import { compactNumber, formatDateTime, timeAgo, titleCase } from '@/lib/format';
import { HEALTH } from '@/lib/status';
import { platformApi } from '@/services/api';
import type { AppVersionConfig, FeatureFlag } from '@/types/admin';

const inv = [qk.platform.system, qk.platform.settings, qk.platform.auditAll];

export default function SystemPage() {
  const q = useSystem();
  const qc = useQueryClient();
  const [maint, setMaint] = useState<null | boolean>(null);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<AppVersionConfig | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const setMaintenance = useApiMutation((on: boolean) => platformApi.setMaintenance(on, message), { invalidate: inv, success: (s) => (s.maintenanceMode ? 'Maintenance mode is ON' : 'Maintenance mode is OFF'), onSuccess: () => setMaint(null) });
  const saveFlag = useApiMutation((v: { key: string; patch: Partial<Pick<FeatureFlag, 'enabled' | 'rollout'>> }) => platformApi.saveFlag(v.key, v.patch), { invalidate: inv, success: (f) => `${f.name} ${f.enabled ? `on for ${f.rollout}%` : 'off'}` });
  const force = useApiMutation((v: AppVersionConfig) => platformApi.saveVersion(v.app, v.platform, { forceUpdate: !v.forceUpdate }), { invalidate: inv, success: (v) => (v.forceUpdate ? 'Force update enabled' : 'Force update disabled') });
  const reset = useApiMutation(() => platformApi.resetDemoData(), {
    success: 'Demo data restored',
    onSuccess: () => {
      setResetOpen(false);
      void qc.invalidateQueries();
    },
  });

  if (q.isPending) return <PageLoader />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  const degraded = d.services.filter((s) => s.status !== 'operational').length;

  return (
    <>
      <PageHeader title="System" description="Health, feature flags, mobile app versions and maintenance." meta={<Badge tone={degraded ? 'warning' : 'success'} dot pulse>{degraded ? `${degraded} degraded` : 'All systems normal'}</Badge>} />

      <Card className={cn('mb-4', d.maintenanceMode && 'border-warning-400 bg-warning-50/60 dark:bg-warning-500/10')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', d.maintenanceMode ? 'bg-warning-500 text-white' : 'bg-surface-3 text-ink-2')}>
            <Construction size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-md font-semibold text-ink">Maintenance mode {d.maintenanceMode ? 'is on' : 'is off'}</p>
            <p className="text-sm text-ink-3">{d.maintenanceMode ? `Apps show: “${d.maintenanceMessage}”` : 'All apps accept bookings normally. Turning it on pauses new bookings everywhere.'}</p>
          </div>
          <Button variant={d.maintenanceMode ? 'success' : 'outline'} onClick={() => (setMessage(d.maintenanceMessage), setMaint(!d.maintenanceMode))}>
            {d.maintenanceMode ? 'Turn off' : 'Turn on'}
          </Button>
        </div>
      </Card>

      <h2 className="mb-2.5 text-md font-semibold text-ink">Service health</h2>
      <ul className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {d.services.map((s) => (
          <li key={s.key}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{s.name}</p>
                <StatusBadge map={HEALTH} value={s.status} size="xs" />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xl font-bold tabular text-ink">
                    {s.history[s.history.length - 1]}
                    <span className="ml-0.5 text-xs font-medium text-ink-3">ms</span>
                  </p>
                  <p className="text-xs text-ink-3">{s.uptime}% uptime, 30d</p>
                </div>
                <Sparkline data={s.history} tone={s.status === 'operational' ? 'success' : s.status === 'degraded' ? 'warning' : 'danger'} className="h-10 w-28" />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h2 className="mb-2.5 flex items-center gap-2 text-md font-semibold text-ink">
            <Flag size={16} /> Feature flags
          </h2>
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {d.flags.map((f) => (
                <FlagRow key={f.key} flag={f} busy={saveFlag.isPending && saveFlag.variables?.key === f.key} onChange={(patch) => saveFlag.mutate({ key: f.key, patch })} />
              ))}
            </ul>
          </Card>
        </div>
        <div className="min-w-0">
          <h2 className="mb-2.5 flex items-center gap-2 text-md font-semibold text-ink">
            <Smartphone size={16} /> Mobile app versions
          </h2>
          <DataTable
            caption="App versions"
            data={d.versions}
            rowKey={(v) => `${v.app}-${v.platform}`}
            dense
            columns={[
              { key: 'app', header: 'App', mobile: 'title', cell: (v) => <span className="flex items-center gap-2 font-medium text-ink">{v.platform === 'ios' ? <Apple size={14} /> : <Smartphone size={14} />}{titleCase(v.app)}<span className="text-xs text-ink-3">{v.platform === 'ios' ? 'iOS' : 'Android'}</span></span> },
              { key: 'latest', header: 'Latest', cell: (v) => <code className="text-sm">{v.latest}</code> },
              { key: 'min', header: 'Min.', cell: (v) => <code className="text-sm">{v.minSupported}</code> },
              { key: 'inst', header: 'Installs', align: 'right', hideBelow: 'lg', cell: (v) => <span className="tabular">{compactNumber(v.activeInstalls)}</span> },
              { key: 'force', header: 'Force', align: 'center', mobile: 'aside', cell: (v) => <Switch size="sm" label={`Force update ${v.app} ${v.platform}`} checked={v.forceUpdate} onChange={() => force.mutate(v)} /> },
              { key: 'edit', header: <span className="sr-only">Edit</span>, align: 'right', mobile: false, cell: (v) => <IconButton icon={Pencil} label="Edit versions" size="sm" onClick={() => setEditing(v)} /> },
            ]}
          />
          <Card className="mt-4">
            <CardHeader title="Demo data" subtitle="This build runs on an in-browser mock backend" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-ink-2">
                <Database size={15} className="text-ink-3" /> {(d.dbSize / 1024).toFixed(0)} KB, seeded {timeAgo(d.seededAt)}
              </p>
              <Button variant="outline" size="sm" icon={RotateCcw} onClick={() => setResetOpen(true)}>
                Reset demo data
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {maint !== null ? (
        <ConfirmDialog
          open
          onClose={() => setMaint(null)}
          onConfirm={() => setMaintenance.mutate(maint)}
          loading={setMaintenance.isPending}
          tone={maint ? 'danger' : 'primary'}
          icon={Construction}
          title={maint ? 'Turn on maintenance mode?' : 'Turn off maintenance mode?'}
          confirmLabel={maint ? 'Turn on' : 'Turn off'}
          confirmDisabled={maint && message.trim().length < 10}
          message={maint ? 'Customers can’t place bookings and providers can’t accept new jobs until you turn it off.' : 'Bookings reopen immediately in every city.'}
        >
          {maint ? <Textarea label="Message shown in the apps" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} /> : null}
        </ConfirmDialog>
      ) : null}
      {editing ? <VersionDialog v={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => reset.mutate()} loading={reset.isPending} tone="danger" icon={RotateCcw} title="Reset demo data?" confirmLabel="Reset" message="All changes made in this browser (bookings, approvals, settings…) are discarded and the original dataset is restored." />
    </>
  );
}

function FlagRow({ flag: f, busy, onChange }: { flag: FeatureFlag; busy: boolean; onChange: (p: Partial<Pick<FeatureFlag, 'enabled' | 'rollout'>>) => void }) {
  const [rollout, setRollout] = useState(f.rollout);
  const commit = () => rollout !== f.rollout && onChange({ rollout });
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
          {f.name}
          <Badge size="xs">{f.audience === 'all' ? 'All apps' : `${titleCase(f.audience)} app`}</Badge>
        </p>
        <p className="text-sm text-ink-3">{f.description}</p>
        <p className="mt-0.5 text-2xs text-ink-3">
          <code>{f.key}</code>, updated {formatDateTime(f.updatedAt)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <label className={cn('flex items-center gap-2', !f.enabled && 'opacity-50')}>
          <span className="sr-only">Rollout for {f.name}</span>
          <input type="range" min={0} max={100} step={5} value={rollout} disabled={!f.enabled || busy} onChange={(e) => setRollout(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} className="h-1.5 w-28 cursor-pointer accent-[var(--panel-solid)]" />
          <span className="w-10 text-right text-sm font-semibold tabular text-ink">{rollout}%</span>
        </label>
        <Switch label={`${f.name} enabled`} checked={f.enabled} disabled={busy} onChange={(v) => onChange({ enabled: v, rollout: v && rollout === 0 ? 10 : rollout })} />
      </div>
    </li>
  );
}

function VersionDialog({ v, onClose }: { v: AppVersionConfig; onClose: () => void }) {
  const [latest, setLatest] = useState(v.latest);
  const [min, setMin] = useState(v.minSupported);
  const ok = /^\d+\.\d+\.\d+$/;
  const m = useApiMutation(() => platformApi.saveVersion(v.app, v.platform, { latest, minSupported: min }), { invalidate: inv, success: 'App versions saved', onSuccess: onClose });
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`${titleCase(v.app)} app, ${v.platform === 'ios' ? 'iOS' : 'Android'}`}
      description="Users below the minimum version are asked to update."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" disabled={!ok.test(latest) || !ok.test(min)} loading={m.isPending} onClick={() => m.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Input label="Latest version" value={latest} onChange={(e) => setLatest(e.target.value)} error={ok.test(latest) ? undefined : 'Use x.y.z'} />
        <Input label="Minimum supported" value={min} onChange={(e) => setMin(e.target.value)} error={ok.test(min) ? undefined : 'Use x.y.z'} />
      </div>
      <Callout tone="info" title="Tip" className="mt-4">
        Raise the minimum only after the new version is live in the store for 48 hours.
      </Callout>
    </Dialog>
  );
}

