import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { toneClasses, type Tone } from '@/config/theme';
import { cn } from '@/lib/cn';
import { usePageTitle } from '@/hooks/usePageTitle';

export function PageHeader({ title, description, actions, back, breadcrumbs, meta }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: string; breadcrumbs?: { label: string; to?: string }[]; meta?: ReactNode }) {
  usePageTitle(typeof title === 'string' ? title : undefined);
  return (
    <header className="mb-5 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-ink-3">
            {breadcrumbs.map((b, i) => (
              <span key={b.label} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight size={12} /> : null}
                {b.to ? (
                  <Link to={b.to} className="focus-ring rounded hover:text-ink">
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="flex items-center gap-2.5">
          {back ? (
            <Link to={back} aria-label="Back" className="focus-ring -ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-3 hover:text-ink">
              <ArrowLeft size={18} />
            </Link>
          ) : null}
          <h1 className="min-w-0 text-xl font-bold text-ink sm:text-2xl">{title}</h1>
          {meta}
        </div>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ink-3 sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Filter/search row above a table. Wraps neatly on small screens. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className)}>{children}</div>;
}

export function KeyValue({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2 text-base', className)}>
      <dt className="shrink-0 text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

export function ProgressBar({ value, tone = 'primary', className, label }: { value: number; tone?: Tone; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-soft)]', toneClasses[tone].dot)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-line', className)} />;
}

/** Highlighted note/banner inside pages. */
export function Callout({ tone = 'info', icon: I, title, children, action, className }: { tone?: Tone; icon?: LucideIcon; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl p-3.5 sm:flex-row sm:items-center', toneClasses[tone].soft, className)}>
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        {I ? <I size={18} className="mt-px shrink-0" /> : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {children ? <div className="mt-0.5 text-sm opacity-90">{children}</div> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
