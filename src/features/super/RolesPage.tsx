import { useState } from 'react';
import { Lock, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Badge, Button, Callout, Card, Checkbox, ConfirmDialog, EmptyState, ErrorState, Input, PageHeader, Skeleton, Textarea } from '@/components/ui';
import { toneClasses } from '@/config/theme';
import { useRoles } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { cn } from '@/lib/cn';
import { PERMISSION_GROUPS, SUPER_ONLY, SUPER_ROLE_ID } from '@/lib/permissions';
import { platformApi } from '@/services/api';
import type { RoleInput } from '@/services/api/platform.api';
import { isApiError } from '@/services/http';
import type { AdminRole, Permission } from '@/types/admin';

const COLORS: AdminRole['color'][] = ['primary', 'accent', 'success', 'info', 'highlight', 'warning', 'danger'];
const inv = [qk.platform.roles, qk.platform.adminsAll, qk.me, qk.platform.auditAll];
type RoleRow = AdminRole & { members: number };

export default function RolesPage() {
  const q = useRoles();
  const [selected, setSelected] = useState<string | 'new'>('');
  const roles = q.data ?? [];
  const current = selected === 'new' ? undefined : (roles.find((r) => r.id === selected) ?? roles[0]);

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Roles bundle permissions. Every admin has exactly one role; changes apply on their next request."
        actions={
          <Button variant="panel" size="sm" icon={Plus} onClick={() => setSelected('new')}>
            New role
          </Button>
        }
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <Skeleton className="h-[520px]" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:overflow-visible">
            {roles.map((r) => {
              const active = selected !== 'new' && current?.id === r.id;
              return (
                <li key={r.id} className="w-64 shrink-0 lg:w-auto">
                  <button type="button" aria-current={active ? 'true' : undefined} onClick={() => setSelected(r.id)} className={cn('focus-ring w-full rounded-card border bg-surface p-4 text-left shadow-card transition-colors', active ? 'border-panel ring-3 ring-panel/15' : 'border-line hover:border-line-strong')}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', toneClasses[r.color].dot)} />
                        <span className="font-semibold text-ink">{r.name}</span>
                      </span>
                      {r.system ? <Badge size="xs">System</Badge> : null}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-ink-3">{r.description}</span>
                    <span className="mt-3 flex items-center gap-3 text-xs text-ink-2">
                      <span className="inline-flex items-center gap-1">
                        <Users size={13} /> {r.members}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck size={13} /> {r.permissions.length} permissions
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {selected === 'new' || current ? <RoleEditor key={selected === 'new' ? 'new' : current!.id} role={selected === 'new' ? undefined : current} onSaved={(id) => setSelected(id)} onDeleted={() => setSelected('')} /> : <EmptyState title="Pick a role" />}
        </div>
      )}
    </>
  );
}

function RoleEditor({ role, onSaved, onDeleted }: { role?: RoleRow; onSaved: (id: string) => void; onDeleted: () => void }) {
  const locked = role?.id === SUPER_ROLE_ID;
  const initial: RoleInput = role ? { name: role.name, description: role.description, permissions: role.permissions, color: role.color } : { name: '', description: '', permissions: ['dashboard.view'], color: 'info' };
  const [v, setV] = useState<RoleInput>(initial);
  const [nameErr, setNameErr] = useState('');
  const [del, setDel] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const save = useApiMutation(() => platformApi.saveRole(v, role?.id), {
    invalidate: inv,
    success: role ? 'Role saved' : 'Role created',
    onSuccess: (r) => onSaved(r.id),
    onError: (e) => isApiError(e) && e.fieldErrors?.name && setNameErr(e.fieldErrors.name),
  });
  const remove = useApiMutation(() => platformApi.deleteRole(role!.id), { invalidate: inv, success: 'Role deleted', onSuccess: () => (setDel(false), onDeleted()) });
  const has = (p: Permission) => v.permissions.includes(p);
  const set = (p: Permission, on: boolean) => setV({ ...v, permissions: on ? [...v.permissions, p] : v.permissions.filter((x) => x !== p) });
  const editable = (p: Permission) => !locked && !SUPER_ONLY.includes(p);

  return (
    <Card padded={false}>
      <div className="grid gap-4 border-b border-line p-4 sm:grid-cols-2 sm:p-5">
        <Input label="Role name" value={v.name} disabled={locked} onChange={(e) => (setNameErr(''), setV({ ...v, name: e.target.value }))} error={nameErr || (v.name && v.name.trim().length < 3 ? 'At least 3 characters' : undefined)} />
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink-2">Colour</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Colour">
            {COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={v.color === c} aria-label={c} disabled={locked} onClick={() => setV({ ...v, color: c })} className={cn('focus-ring h-8 w-8 rounded-full transition-transform disabled:opacity-50', toneClasses[c].dot, v.color === c && 'scale-110 ring-3 ring-offset-2 ring-offset-surface ring-line-strong')} />
            ))}
          </div>
        </div>
        <Textarea label="Description" rows={2} value={v.description} disabled={locked} onChange={(e) => setV({ ...v, description: e.target.value })} containerClassName="sm:col-span-2" />
        {locked ? (
          <Callout tone="highlight" icon={Lock} title="The Super Admin role can’t be changed" className="sm:col-span-2">
            It always holds every permission so the platform can’t be locked out.
          </Callout>
        ) : null}
      </div>

      <div className="divide-y divide-line">
        {PERMISSION_GROUPS.map((g) => {
          const keys = g.permissions.map((p) => p.key);
          const editableKeys = keys.filter(editable);
          const all = editableKeys.length > 0 && editableKeys.every(has);
          const some = editableKeys.some(has) && !all;
          const superGroup = g.key === 'platform';
          return (
            <section key={g.key} className="p-4 sm:px-5">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {g.label}
                  {superGroup ? <Lock size={13} className="text-ink-3" /> : null}
                </h3>
                {editableKeys.length ? (
                  <Checkbox label={`Select all ${g.label}`} checked={all} indeterminate={some} onChange={(on) => setV({ ...v, permissions: on ? [...new Set([...v.permissions, ...editableKeys])] : v.permissions.filter((p) => !editableKeys.includes(p)) })}>
                    <span className="text-xs text-ink-3">All</span>
                  </Checkbox>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {g.permissions.map((p) => (
                  <Checkbox
                    key={p.key}
                    checked={has(p.key)}
                    disabled={!editable(p.key)}
                    onChange={(on) => set(p.key, on)}
                    className={cn('flex items-start gap-2.5 rounded-xl border p-3 transition-colors [&>span:first-child]:mt-0.5', has(p.key) ? 'border-panel/40 bg-panel-soft/50' : 'border-line hover:border-line-strong', !editable(p.key) && 'opacity-70')}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{p.label}</span>
                      <span className="block text-xs text-ink-3">{p.description}</span>
                    </span>
                  </Checkbox>
                ))}
              </div>
              {superGroup && !locked ? <p className="mt-2 text-xs text-ink-3">Only the Super Admin role can hold platform permissions.</p> : null}
            </section>
          );
        })}
      </div>

      {!locked ? (
        <div className="sticky bottom-0 flex flex-col-reverse gap-2 rounded-b-card border-t border-line bg-surface/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {role && !role.system ? (
            <Button variant="ghost" icon={Trash2} className="text-danger-600" onClick={() => setDel(true)}>
              Delete role
            </Button>
          ) : (
            <span className="text-xs text-ink-3">{role?.system ? 'System roles can be edited but not deleted.' : `${v.permissions.length} permissions selected`}</span>
          )}
          <div className="flex gap-2">
            <Button variant="outline" disabled={!dirty} onClick={() => setV(initial)}>
              Reset
            </Button>
            <Button variant="panel" disabled={!dirty || v.name.trim().length < 3} loading={save.isPending} onClick={() => save.mutate()}>
              {role ? 'Save role' : 'Create role'}
            </Button>
          </div>
        </div>
      ) : null}
      <ConfirmDialog open={del} onClose={() => setDel(false)} onConfirm={() => remove.mutate()} loading={remove.isPending} tone="danger" icon={Trash2} title={`Delete ${role?.name}?`} confirmLabel="Delete role" message={role?.members ? `${role.members} admin(s) still have this role — move them first.` : 'This can’t be undone.'} />
    </Card>
  );
}
