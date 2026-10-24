import { useState } from 'react';
import { Bike, CalendarCheck2, MapPin, Pencil, Plus, Power, Store, Users } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Dialog, ErrorState, IconButton, Input, PageHeader, Skeleton, Switch } from '@/components/ui';
import { useCities } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import { platformApi } from '@/services/api';
import type { CityInput } from '@/services/api/platform.api';
import { isApiError } from '@/services/http';
import type { City } from '@/types/models';

const inv = [qk.platform.cities, qk.lookups, qk.dashboard.super];

export default function CitiesPage() {
  const q = useCities();
  const [editing, setEditing] = useState<City | 'new' | null>(null);
  const [toggling, setToggling] = useState<City | null>(null);
  const toggle = useApiMutation((c: City) => platformApi.saveCity({ name: c.name, state: c.state, radiusKm: c.radiusKm, active: !c.active }, c.id), { invalidate: inv, success: (c) => (c.active ? `${c.name} is live` : `${c.name} paused`), onSuccess: () => setToggling(null) });
  return (
    <>
      <PageHeader
        title="Cities & zones"
        description="Where Servio operates. Paused cities stop accepting new bookings."
        actions={
          <Button variant="panel" size="sm" icon={Plus} onClick={() => setEditing('new')}>
            Add city
          </Button>
        }
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {q.data.map((c) => (
            <li key={c.id}>
              <Card className={cn('flex h-full flex-col', !c.active && 'border-dashed')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', c.active ? 'panel-gradient text-white' : 'bg-surface-3 text-ink-3')}>
                      <MapPin size={20} />
                    </span>
                    <div>
                      <p className="text-md font-bold text-ink">{c.name}</p>
                      <p className="text-sm text-ink-3">{c.state}</p>
                    </div>
                  </div>
                  <Badge tone={c.active ? 'success' : 'neutral'} dot pulse={c.active}>
                    {c.active ? 'Live' : 'Paused'}
                  </Badge>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-2">
                  {[
                    { icon: Store, label: 'Providers', v: c.providers },
                    { icon: Bike, label: 'Partners', v: c.partners },
                    { icon: Users, label: 'Customers', v: c.customers },
                    { icon: CalendarCheck2, label: 'Bookings 30d', v: c.bookings30 },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-surface-2 px-3 py-2.5">
                      <dt className="flex items-center gap-1.5 text-xs text-ink-3">
                        <s.icon size={12} /> {s.label}
                      </dt>
                      <dd className="mt-0.5 text-lg font-bold tabular text-ink">{formatNumber(s.v)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-sm text-ink-3">
                  <span>
                    {c.radiusKm} km radius, {new Date(c.launchedAt).getTime() > Date.now() ? `launches ${formatDate(c.launchedAt)}` : `since ${formatDate(c.launchedAt)}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <IconButton icon={Pencil} label={`Edit ${c.name}`} size="sm" onClick={() => setEditing(c)} />
                    <Switch size="sm" label={`${c.name} live`} checked={c.active} onChange={() => setToggling(c)} />
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {editing ? <CityDialog city={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={() => toggling && toggle.mutate(toggling)}
        loading={toggle.isPending}
        icon={Power}
        tone={toggling?.active ? 'danger' : 'primary'}
        title={toggling?.active ? `Pause ${toggling?.name}?` : `Launch ${toggling?.name}?`}
        confirmLabel={toggling?.active ? 'Pause city' : 'Go live'}
        message={toggling?.active ? 'Customers there can’t place new bookings. Existing bookings continue.' : 'The city appears in the app’s city picker and bookings open immediately.'}
      />
    </>
  );
}

function CityDialog({ city, onClose }: { city?: City; onClose: () => void }) {
  const [v, setV] = useState<CityInput>(city ? { name: city.name, state: city.state, radiusKm: city.radiusKm, active: city.active } : { name: '', state: '', radiusKm: 20, active: false });
  const [err, setErr] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const errs = { name: v.name.trim().length < 2 ? 'Enter the city' : err.name, state: v.state.trim().length < 2 ? 'Enter the state' : undefined, radius: v.radiusKm < 5 || v.radiusKm > 100 ? '5–100 km' : undefined };
  const m = useApiMutation(() => platformApi.saveCity(v, city?.id), { invalidate: inv, success: city ? 'City saved' : `${v.name} added`, onSuccess: onClose, onError: (e) => isApiError(e) && e.fieldErrors && setErr(e.fieldErrors) });
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={city ? `Edit ${city.name}` : 'Add city'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" loading={m.isPending} onClick={() => (setTouched(true), !Object.values(errs).some(Boolean) && m.mutate())}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Input label="City" value={v.name} onChange={(e) => (setErr({}), setV({ ...v, name: e.target.value }))} error={touched || err.name ? errs.name : undefined} />
        <Input label="State" value={v.state} onChange={(e) => setV({ ...v, state: e.target.value })} error={touched ? errs.state : undefined} />
        <Input label="Service radius" suffix="km" type="number" value={v.radiusKm} onChange={(e) => setV({ ...v, radiusKm: Number(e.target.value) })} error={errs.radius} hint="Distance from the city centre where bookings are accepted" />
        <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-ink">
          Live now
          <Switch label="Live now" checked={v.active} onChange={(a) => setV({ ...v, active: a })} />
        </label>
      </div>
    </Dialog>
  );
}
