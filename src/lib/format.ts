import { env } from '@/config/env';

const { locale, code } = env.currency;
const money0 = new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
const num = new Intl.NumberFormat(locale);

export const formatMoney = (n: number) => money0.format(Math.round(n));
export const formatMoneyCompact = (n: number) => `${env.currency.symbol}${compact.format(n)}`;
export const formatNumber = (n: number) => num.format(n);
export const compactNumber = (n: number) => compact.format(n);
export const formatPercent = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

const d = (v: string | Date) => (typeof v === 'string' ? new Date(v.length === 10 ? `${v}T00:00:00` : v) : v);

export const formatDate = (v: string | Date) => d(v).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
export const formatDay = (v: string | Date) => d(v).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
export const formatDateTime = (v: string | Date) =>
  d(v).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
};

export function timeAgo(v: string | Date) {
  const s = Math.round((Date.now() - d(v).getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(v);
}

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const pluralize = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/** Today's date as YYYY-MM-DD in local time. */
export const todayKey = () => toDateKey(new Date());
