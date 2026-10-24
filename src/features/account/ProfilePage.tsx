import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, MapPin, ShieldCheck } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, Input, PageHeader, Segmented, SwitchRow } from '@/components/ui';
import { useAdmin } from '@/hooks/useAccess';
import { useApiMutation } from '@/hooks/useApiMutation';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { authApi } from '@/services/api';
import { isApiError } from '@/services/http';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore, type ThemeMode } from '@/store/ui.store';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60),
  phone: z.string().trim().regex(/^\+?[\d\s-]{10,16}$/, 'Enter a valid phone number'),
});
const passwordSchema = z
  .object({
    current: z.string().min(1, 'Enter your current password'),
    next: z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Add an uppercase letter').regex(/\d/, 'Add a number').regex(/[^A-Za-z0-9]/, 'Add a symbol'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'Passwords don’t match' })
  .refine((v) => v.next !== v.current, { path: ['next'], message: 'Choose a different password' });

export default function ProfilePage() {
  const admin = useAdmin()!;
  const setAdmin = useAuthStore((s) => s.setAdmin);
  const { theme, setTheme } = useUiStore();
  const [tfaConfirm, setTfaConfirm] = useState(false);

  const pf = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), values: { name: admin.name, phone: admin.phone } });
  const saveProfile = useApiMutation((v: z.infer<typeof profileSchema>) => authApi.updateProfile(v), { success: 'Profile saved', onSuccess: (a) => (setAdmin(a), pf.reset({ name: a.name, phone: a.phone })) });

  const pw = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { current: '', next: '', confirm: '' } });
  const savePw = useApiMutation((v: z.infer<typeof passwordSchema>) => authApi.changePassword(v.current, v.next), {
    success: 'Password updated',
    toastError: false,
    onSuccess: () => pw.reset(),
    onError: (e) => pw.setError('current', { message: isApiError(e) ? e.message : 'Could not update password' }),
  });
  const tfa = useApiMutation(() => authApi.setTwoFactor(!admin.twoFactor), { success: (a) => (a.twoFactor ? '2-step verification on' : '2-step verification off'), onSuccess: (a) => (setAdmin(a), setTfaConfirm(false)) });
  const strength = (() => {
    const v = pw.watch('next');
    return [v.length >= 8, /[A-Z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v)].filter(Boolean).length;
  })();

  return (
    <>
      <PageHeader title="Profile & security" description="Your admin account, sign-in security and appearance." />
      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card className="text-center">
            <Avatar name={admin.name} src={admin.avatar} size="xl" className="mx-auto" />
            <p className="mt-3 text-lg font-bold text-ink">{admin.name}</p>
            <p className="text-sm text-ink-3">{admin.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <Badge tone={admin.role.color}>{admin.role.name}</Badge>
              {admin.cityScope.length ? (
                <Badge tone="accent">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} /> {admin.cityScope.join(', ')}
                  </span>
                </Badge>
              ) : (
                <Badge>All cities</Badge>
              )}
            </div>
            <p className="mt-3 text-xs text-ink-3">Member since {formatDate(admin.createdAt)}</p>
          </Card>
          <Card>
            <CardHeader title="Your access" subtitle={`${admin.role.permissions.length} permissions via ${admin.role.name}`} />
            <ul className="flex flex-col gap-3">
              {PERMISSION_GROUPS.map((g) => {
                const held = g.permissions.filter((p) => admin.role.permissions.includes(p.key));
                if (!held.length) return null;
                return (
                  <li key={g.key}>
                    <p className="mb-1 text-xs font-semibold text-ink-3">{g.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {held.map((p) => (
                        <Badge key={p.key} size="xs" tone="primary">
                          {p.label}
                        </Badge>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader title="Profile" />
            <form onSubmit={pf.handleSubmit((v) => saveProfile.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" error={pf.formState.errors.name?.message} {...pf.register('name')} />
              <Input label="Phone" type="tel" error={pf.formState.errors.phone?.message} {...pf.register('phone')} />
              <Input label="Work email" value={admin.email} disabled hint="Ask a Super Admin to change your email" containerClassName="sm:col-span-2" />
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" variant="panel" disabled={!pf.formState.isDirty} loading={saveProfile.isPending}>
                  Save profile
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Change password" subtitle="Demo password is Demo@1234" />
            <form onSubmit={pw.handleSubmit((v) => savePw.mutate(v))} noValidate className="grid gap-4 sm:grid-cols-3">
              <Input label="Current password" type="password" autoComplete="current-password" error={pw.formState.errors.current?.message} {...pw.register('current')} />
              <div>
                <Input label="New password" type="password" autoComplete="new-password" error={pw.formState.errors.next?.message} {...pw.register('next')} />
                <div className="mt-2 grid grid-cols-4 gap-1" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={cn('h-1 rounded-full', i < strength ? (strength <= 2 ? 'bg-danger-500' : strength === 3 ? 'bg-warning-500' : 'bg-success-500') : 'bg-surface-3')} />
                  ))}
                </div>
              </div>
              <Input label="Confirm password" type="password" autoComplete="new-password" error={pw.formState.errors.confirm?.message} {...pw.register('confirm')} />
              <div className="flex justify-end sm:col-span-3">
                <Button type="submit" variant="outline" icon={KeyRound} loading={savePw.isPending}>
                  Update password
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Security & appearance" />
            <div className="divide-y divide-line">
              <SwitchRow icon={ShieldCheck} title="2-step verification" description="Ask for a one-time code at every sign-in" checked={admin.twoFactor} onChange={() => setTfaConfirm(true)} />
              <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">Theme</p>
                  <p className="text-sm text-ink-3">Saved on this device</p>
                </div>
                <Segmented<ThemeMode> label="Theme" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]} />
              </div>
            </div>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={tfaConfirm}
        onClose={() => setTfaConfirm(false)}
        onConfirm={() => tfa.mutate()}
        loading={tfa.isPending}
        tone={admin.twoFactor ? 'danger' : 'primary'}
        icon={ShieldCheck}
        title={admin.twoFactor ? 'Turn off 2-step verification?' : 'Turn on 2-step verification?'}
        confirmLabel={admin.twoFactor ? 'Turn off' : 'Turn on'}
        message={admin.twoFactor ? 'Your account will be protected by password only.' : 'You’ll enter a one-time code after your password each time you sign in. Demo code: 123456.'}
      />
    </>
  );
}
