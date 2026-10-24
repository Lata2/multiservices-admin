import { useState } from 'react';
import { MailPlus, Pencil, ShieldCheck, ShieldOff, Trash2, UserCheck, UserCog, UserPlus } from 'lucide-react';
import { TablePager } from '@/components/domain/ListKit';
import { Badge, Button, ChipGroup, ConfirmDialog, DataTable, Dialog, EmptyState, ErrorState, Input, Menu, PageHeader, PersonCell, SearchInput, Select, StatusBadge, Tabs, Toolbar } from '@/components/ui';
import { useAdmins, useLookups, useRoles } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useAdmin } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { timeAgo } from '@/lib/format';
import { SUPER_ROLE_ID } from '@/lib/permissions';
import { ADMIN_STATUS } from '@/lib/status';
import { platformApi } from '@/services/api';
import type { AdminInput } from '@/services/api/platform.api';
import { isApiError } from '@/services/http';
import type { AdminStatus, AdminUser } from '@/types/admin';

type F = { status?: string; roleId?: string };
const inv = [qk.platform.adminsAll, qk.platform.roles, qk.lookups, qk.dashboard.super, qk.platform.auditAll];

export default function AdminsPage() {
  const t = useTableState<F>({ sort: 'created', dir: 'asc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const q = useAdmins(params as never);
  const roles = useRoles().data ?? [];
  const me = useAdmin();
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [confirm, setConfirm] = useState<{ admin: AdminUser; action: 'suspend' | 'activate' | 'remove' } | null>(null);
  const setStatus = useApiMutation((v: { id: string; status: AdminStatus }) => platformApi.setAdminStatus(v.id, v.status), { invalidate: inv, success: (a) => `${a.name} ${a.status === 'suspended' ? 'suspended' : 'activated'}`, onSuccess: () => setConfirm(null) });
  const remove = useApiMutation((id: string) => platformApi.deleteAdmin(id), { invalidate: inv, success: 'Admin removed', onSuccess: () => setConfirm(null) });
  const resend = useApiMutation((id: string) => platformApi.resendInvite(id), { success: 'Invitation re-sent' });
  const roleOf = (id: string) => roles.find((r) => r.id === id);

  return (
    <>
      <PageHeader
        title="Admin team"
        description="People who can sign in to this console, their role and the cities they manage."
        actions={
          <Button variant="panel" size="sm" icon={UserPlus} onClick={() => setEditing('new')}>
            Invite admin
          </Button>
        }
      />
      <Tabs
        label="Status"
        className="mb-3"
        value={params.status ?? 'all'}
        onChange={(v) => t.setFilter('status', v)}
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'invited', label: 'Invited' },
          { value: 'suspended', label: 'Suspended' },
        ]}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email…" className="sm:w-64" />
        <Select aria-label="Role" compact placeholder="All roles" value={params.roleId ?? ''} onChange={(e) => t.setFilter('roleId', e.target.value)} options={roles.map((r) => ({ value: r.id, label: r.name }))} containerClassName="sm:w-48" />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Admins"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(a) => a.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          empty={<EmptyState icon={UserCog} title="No admins match" />}
          columns={[
            { key: 'name', header: 'Admin', sortKey: 'name', mobile: 'title', cell: (a) => <span className="flex items-center gap-2"><PersonCell name={a.name} sub={a.email} src={a.avatar} />{a.id === me?.id ? <Badge size="xs">You</Badge> : null}</span> },
            { key: 'role', header: 'Role', cell: (a) => { const r = roleOf(a.roleId); return r ? <Badge tone={r.color} size="xs">{r.name}</Badge> : '—'; } },
            { key: 'scope', header: 'Cities', hideBelow: 'lg', cell: (a) => (a.cityScope.length ? <span className="text-sm">{a.cityScope.join(', ')}</span> : <span className="text-ink-3">All cities</span>) },
            { key: '2fa', header: '2-step', hideBelow: 'xl', cell: (a) => (a.twoFactor ? <ShieldCheck size={16} className="text-success-500" aria-label="Enabled" /> : <ShieldOff size={16} className="text-ink-3" aria-label="Off" />) },
            { key: 'active', header: 'Last active', sortKey: 'active', hideBelow: 'md', cell: (a) => (a.lastActiveAt ? timeAgo(a.lastActiveAt) : <span className="text-ink-3">Never</span>) },
            { key: 'status', header: 'Status', mobile: 'aside', cell: (a) => <StatusBadge map={ADMIN_STATUS} value={a.status} size="xs" /> },
            {
              key: 'menu',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              mobile: false,
              cell: (a) =>
                a.id === me?.id ? null : (
                  <Menu
                    items={[
                      { label: 'Edit', icon: Pencil, onSelect: () => setEditing(a) },
                      { label: 'Resend invite', icon: MailPlus, onSelect: () => resend.mutate(a.id), hidden: a.status !== 'invited' },
                      { label: 'Suspend access', icon: ShieldOff, tone: 'danger', onSelect: () => setConfirm({ admin: a, action: 'suspend' }), hidden: a.status === 'suspended' },
                      { label: 'Reactivate', icon: UserCheck, onSelect: () => setConfirm({ admin: a, action: 'activate' }), hidden: a.status !== 'suspended' },
                      { label: 'Remove', icon: Trash2, tone: 'danger', onSelect: () => setConfirm({ admin: a, action: 'remove' }) },
                    ]}
                  />
                ),
            },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
      {editing ? <AdminDialog admin={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {confirm ? (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          loading={setStatus.isPending || remove.isPending}
          tone={confirm.action === 'activate' ? 'primary' : 'danger'}
          title={confirm.action === 'remove' ? `Remove ${confirm.admin.name}?` : confirm.action === 'suspend' ? `Suspend ${confirm.admin.name}?` : `Reactivate ${confirm.admin.name}?`}
          confirmLabel={confirm.action === 'remove' ? 'Remove' : confirm.action === 'suspend' ? 'Suspend' : 'Reactivate'}
          message={confirm.action === 'remove' ? 'They lose access immediately. Their past actions stay in the audit log.' : confirm.action === 'suspend' ? 'They are signed out and can’t sign in until reactivated.' : 'They can sign in again with their existing role.'}
          onConfirm={() => (confirm.action === 'remove' ? remove.mutate(confirm.admin.id) : setStatus.mutate({ id: confirm.admin.id, status: confirm.action === 'suspend' ? 'suspended' : 'active' }))}
        />
      ) : null}
    </>
  );
}

function AdminDialog({ admin, onClose }: { admin?: AdminUser; onClose: () => void }) {
  const roles = useRoles().data ?? [];
  const cities = (useLookups().data?.cities ?? []).map((c) => c.name);
  const me = useAdmin();
  const [v, setV] = useState<AdminInput>(admin ? { name: admin.name, email: admin.email, phone: admin.phone, roleId: admin.roleId, cityScope: admin.cityScope } : { name: '', email: '', phone: '', roleId: 'role_support', cityScope: [] });
  const [touched, setTouched] = useState(false);
  const [serverErr, setServerErr] = useState<Record<string, string>>({});
  const errs = {
    name: v.name.trim().length < 2 ? 'Enter a name' : undefined,
    email: !/^\S+@\S+\.\S+$/.test(v.email) ? 'Enter a valid email' : serverErr.email,
    phone: !/^\+?[\d\s-]{10,16}$/.test(v.phone) ? 'Enter a valid phone' : undefined,
  };
  const isSuper = v.roleId === SUPER_ROLE_ID;
  const m = useApiMutation(() => platformApi.saveAdmin(v, admin?.id), {
    invalidate: inv,
    success: admin ? 'Admin updated' : `Invitation sent to ${v.email}`,
    onSuccess: onClose,
    onError: (e) => isApiError(e) && e.fieldErrors && setServerErr(e.fieldErrors),
  });
  const ok = !Object.values(errs).some(Boolean);
  return (
    <Dialog
      open
      onClose={onClose}
      title={admin ? `Edit ${admin.name}` : 'Invite admin'}
      description={admin ? undefined : 'They’ll get an email to set a password. Access starts when they accept.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" loading={m.isPending} onClick={() => (setTouched(true), ok && m.mutate())}>
            {admin ? 'Save changes' : 'Send invite'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={touched ? errs.name : undefined} />
        <Input label="Phone" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} error={touched ? errs.phone : undefined} />
        <Input label="Work email" type="email" value={v.email} onChange={(e) => (setServerErr({}), setV({ ...v, email: e.target.value }))} error={touched || serverErr.email ? errs.email : undefined} containerClassName="sm:col-span-2" />
        <Select label="Role" value={v.roleId} disabled={admin?.id === me?.id} onChange={(e) => setV({ ...v, roleId: e.target.value })} options={roles.map((r) => ({ value: r.id, label: `${r.name} (${r.permissions.length} permissions)` }))} containerClassName="sm:col-span-2" hint={roles.find((r) => r.id === v.roleId)?.description} />
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-semibold text-ink-2">City access</p>
          {isSuper ? (
            <p className="text-sm text-ink-3">Super Admins always see every city.</p>
          ) : (
            <>
              <ChipGroup label="Cities" value={v.cityScope} onChange={(c) => setV({ ...v, cityScope: c })} options={cities.map((c) => ({ value: c, label: c }))} />
              <p className="mt-1.5 text-xs text-ink-3">{v.cityScope.length ? `Limited to ${v.cityScope.length} cit${v.cityScope.length > 1 ? 'ies' : 'y'}.` : 'None selected = all cities.'}</p>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
