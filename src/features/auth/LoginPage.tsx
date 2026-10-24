import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Logo, LogoMark } from '@/components/layout/Logo';
import { Badge, Button, Dialog, Input } from '@/components/ui';
import { env } from '@/config/env';
import { panelBase } from '@/hooks/useAccess';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';
import { authApi } from '@/services/api';
import type { LoginResult } from '@/services/api/auth.api';
import { errorMessage, isApiError } from '@/services/http';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import type { SessionAdmin } from '@/types/admin';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type Values = z.infer<typeof schema>;

const DEMO = [
  { email: 'superadmin@servio.app', role: 'Super Admin', note: 'Full platform, 2-step code', tone: 'highlight' as const },
  { email: 'admin@servio.app', role: 'Operations Admin', note: 'All admin modules', tone: 'primary' as const },
  { email: 'finance@servio.app', role: 'Finance Manager', note: 'Payments & payouts', tone: 'success' as const },
  { email: 'support@servio.app', role: 'Support Agent', note: 'Tickets & bookings', tone: 'info' as const },
  { email: 'citymanager@servio.app', role: 'City Manager', note: 'Mumbai & Pune only', tone: 'accent' as const },
];

export default function LoginPage() {
  usePageTitle('Sign in');
  const { token, admin, signIn } = useAuthStore();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [otpStep, setOtpStep] = useState<Extract<LoginResult, { step: 'otp' }> | null>(null);
  const [forgot, setForgot] = useState(false);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  const { register, handleSubmit, formState, setValue, setError } = form;

  if (token && admin) return <Navigate to={panelBase(admin.panel)} replace />;

  const finish = (t: string, a: SessionAdmin) => {
    signIn(t, a);
    toast.success(`Welcome back, ${a.name.split(' ')[0]}`);
    const next = sp.get('next');
    navigate(next && next.startsWith(panelBase(a.panel)) ? next : panelBase(a.panel), { replace: true });
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      const r = await authApi.login(v.email, v.password);
      if (r.step === 'otp') setOtpStep(r);
      else finish(r.token, r.admin);
    } catch (e) {
      if (isApiError(e) && e.fieldErrors?.password) setError('password', { message: e.fieldErrors.password });
      else toast.error(errorMessage(e));
    }
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-neutral-900 p-10 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-500/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-highlight-500/25 blur-3xl" aria-hidden />
        <div className="relative">
          <Logo inverse />
        </div>
        <div className="relative mt-auto max-w-md">
          <h1 className="text-3xl font-bold leading-tight">Run every booking, provider and payout from one place.</h1>
          <p className="mt-3 text-md text-white/65">The operations console behind the Servio customer, provider and delivery apps.</p>
          <dl className="mt-8 grid grid-cols-3 gap-3">
            {[
              ['12', 'service categories'],
              ['5', 'live cities'],
              ['4', 'admin roles'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <dt className="text-2xl font-bold">{n}</dt>
                <dd className="mt-0.5 text-xs text-white/60">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <LogoMark className="h-11 w-11" />
          </div>
          {otpStep ? (
            <OtpStep challenge={otpStep} onBack={() => setOtpStep(null)} onDone={finish} />
          ) : (
            <>
              <h2 className="text-2xl font-bold text-ink">Sign in</h2>
              <p className="mt-1 text-base text-ink-3">Use your work email to access the console.</p>
              <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-4">
                <Input label="Work email" type="email" autoComplete="username" icon={Mail} placeholder="you@servio.app" error={formState.errors.email?.message} {...register('email')} />
                <Input label="Password" type="password" autoComplete="current-password" icon={Lock} placeholder="••••••••" error={formState.errors.password?.message} {...register('password')} />
                <div className="-mt-1 flex justify-end">
                  <button type="button" onClick={() => setForgot(true)} className="focus-ring rounded text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300">
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" variant="primary" size="lg" fullWidth loading={formState.isSubmitting}>
                  Sign in
                </Button>
              </form>

              <section aria-labelledby="demo-h" className="mt-8 rounded-2xl border border-dashed border-line-strong p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 id="demo-h" className="text-sm font-semibold text-ink">
                    Demo accounts
                  </h3>
                  <span className="text-xs text-ink-3">
                    Password <code className="font-semibold text-ink">{env.demoPassword}</code>
                  </span>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {DEMO.map((d) => (
                    <li key={d.email}>
                      <button
                        type="button"
                        onClick={() => {
                          setValue('email', d.email, { shouldValidate: true });
                          setValue('password', env.demoPassword, { shouldValidate: true });
                        }}
                        className="focus-ring flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-3"
                      >
                        <Badge tone={d.tone} size="xs" className="w-28 justify-center">
                          {d.role}
                        </Badge>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{d.email}</span>
                          <span className="block truncate text-xs text-ink-3">{d.note}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-3">Demo mode only: sign-in and roles are simulated in the browser and are not a security boundary.</p>
              </section>
            </>
          )}
        </div>
      </main>
      <ForgotDialog open={forgot} onClose={() => setForgot(false)} />
    </div>
  );
}

function OtpStep({ challenge, onBack, onDone }: { challenge: Extract<LoginResult, { step: 'otp' }>; onBack: () => void; onDone: (t: string, a: SessionAdmin) => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code');
    setLoading(true);
    try {
      const r = await authApi.verifyOtp(challenge.challengeId, code);
      onDone(r.token, r.admin);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate>
      <button type="button" onClick={onBack} className="focus-ring mb-6 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft size={15} /> Back
      </button>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight-50 text-highlight-600 dark:bg-highlight-500/15">
        <ShieldCheck size={22} />
      </span>
      <h2 className="mt-4 text-2xl font-bold text-ink">2-step verification</h2>
      <p className="mt-1 text-base text-ink-3">We sent a 6-digit code to {challenge.destination}.</p>
      <div className="mt-6">
        <Input
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          icon={KeyRound}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''));
            setError('');
          }}
          error={error}
          className={cn('text-lg font-semibold tracking-[0.4em]')}
          hint={`Demo code: ${env.demoOtp}`}
        />
      </div>
      <Button type="submit" size="lg" fullWidth className="mt-5" loading={loading}>
        Verify and continue
      </Button>
    </form>
  );
}

function ForgotDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [error, setError] = useState('');
  const close = () => {
    onClose();
    setTimeout(() => {
      setState('idle');
      setEmail('');
      setError('');
    }, 200);
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      size="sm"
      title="Reset password"
      description={state === 'sent' ? undefined : 'We’ll email you a link to set a new password.'}
      footer={
        state === 'sent' ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={state === 'loading'}
              onClick={async () => {
                setState('loading');
                try {
                  await authApi.forgotPassword(email);
                  setState('sent');
                } catch (e) {
                  setError(errorMessage(e));
                  setState('idle');
                }
              }}
            >
              Send reset link
            </Button>
          </>
        )
      }
    >
      {state === 'sent' ? (
        <p className="text-base text-ink-2">If an account exists for <b>{email}</b>, a reset link is on its way. It expires in 30 minutes.</p>
      ) : (
        <Input label="Work email" type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
      )}
    </Dialog>
  );
}
