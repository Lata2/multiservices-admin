import { useId } from 'react';
import type { Tone } from '@/config/theme';

const toneVar: Record<Tone, string> = {
  neutral: 'var(--color-neutral-400)',
  primary: 'var(--color-primary-500)',
  success: 'var(--color-success-500)',
  warning: 'var(--color-warning-500)',
  danger: 'var(--color-danger-500)',
  info: 'var(--color-info-500)',
  accent: 'var(--color-accent-500)',
  highlight: 'var(--color-highlight-500)',
};
export const toneColor = (t: Tone) => toneVar[t];

/** Dependency-free SVG sparkline (keeps KPI cards light). */
export function Sparkline({ data, tone = 'primary', className }: { data: number[]; tone?: Tone; className?: string }) {
  const id = useId();
  if (data.length < 2) return null;
  const w = 100;
  const h = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const color = toneVar[tone];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
