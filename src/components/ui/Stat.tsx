import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { toneClasses, toneGradient, type Tone } from '@/config/theme';
import { cn } from '@/lib/cn';
import { Sparkline } from '../charts/Sparkline';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  /** Fractional change vs previous period, e.g. 0.124 = +12.4%. */
  delta?: number;
  deltaLabel?: string;
  /** For metrics where down is good (cancellations). */
  invertDelta?: boolean;
  hint?: ReactNode;
  spark?: number[];
  to?: string;
  className?: string;
}

export function StatCard({ label, value, icon: I, tone = 'primary', delta, deltaLabel = 'vs prev. 30d', invertDelta, hint, spark, to, className }: StatCardProps) {
  const good = delta === undefined ? undefined : invertDelta ? delta <= 0 : delta >= 0;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', toneGradient[tone])}>
          <I size={19} />
        </span>
        {spark?.length ? <Sparkline data={spark} tone={tone} className="h-10 w-24 max-sm:hidden" /> : null}
      </div>
      <p className="mt-3.5 text-sm font-medium text-ink-3">{label}</p>
      <p className="mt-0.5 truncate text-2xl font-bold tabular text-ink">{value}</p>
      {delta !== undefined || hint ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-3">
          {delta !== undefined ? (
            <span className={cn('inline-flex items-center gap-0.5 font-semibold', good ? toneClasses.success.text : toneClasses.danger.text)}>
              {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {delta >= 0 ? '+' : ''}
              {(delta * 100).toFixed(1)}%
            </span>
          ) : null}
          <span className="truncate">{delta !== undefined ? deltaLabel : hint}</span>
        </p>
      ) : null}
    </>
  );
  const cls = cn('block min-w-0 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5', to && 'card-hover focus-ring', className);
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Small inline metric used inside cards / detail headers. */
export function MiniStat({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2 px-3.5 py-3">
      <p className="truncate text-xs font-medium text-ink-3">{label}</p>
      <p className={cn('mt-0.5 truncate text-lg font-bold tabular text-ink', tone && toneClasses[tone].text)}>{value}</p>
    </div>
  );
}
