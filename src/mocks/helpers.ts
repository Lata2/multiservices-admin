/** Deterministic helpers so seeded mock data is stable between runs. */

let seed = 42;
export function rand(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
export function resetSeed(s = 42) {
  seed = s;
}
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
export function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1][0];
}
export function between(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
export function round1(n: number) {
  return Math.round(n * 10) / 10;
}
export function sample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}

export const DAY = 86_400_000;

/** ISO timestamp `days` from now (negative = past) at the given local time. */
export function daysFromNow(days: number, hour = 10, minute = 0): string {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
/** YYYY-MM-DD `days` from now in local time. */
export function dateKey(days: number): string {
  const d = new Date(Date.now() + days * DAY);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}
export function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}
export function avatar(n: number): string {
  return `https://i.pravatar.cc/120?img=${(n % 70) + 1}`;
}
export function phone(): string {
  return `+91 9${between(1000, 9999)} ${between(10000, 99999)}`;
}

let counter = 1000;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
export function fakeIp() {
  return `${pick([49, 103, 106, 117, 122, 157, 183])}.${between(1, 254)}.${between(1, 254)}.${between(1, 254)}`;
}
