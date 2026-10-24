import { useId, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartColors, seriesPalette } from '@/config/theme';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

export interface Series {
  key: string;
  label: string;
  color?: string;
  /** Plot on the right axis (e.g. counts next to currency). */
  right?: boolean;
}

type Fmt = (v: number) => string;
const axisStyle = { fontSize: 11, fill: chartColors.axis } as const;

function TooltipBox({ active, payload, label, format, labelFormat }: { active?: boolean; payload?: { name?: string; value?: number; color?: string; dataKey?: string; payload?: Record<string, unknown> }[]; label?: string | number; format?: Record<string, Fmt> | Fmt; labelFormat?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  const fmt = (k: string, v: number) => (typeof format === 'function' ? format(v) : format?.[k]?.(v) ?? formatNumber(v));
  return (
    <div className="min-w-36 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm shadow-lg">
      {label !== undefined && label !== '' ? <p className="mb-1.5 font-semibold text-ink">{labelFormat ? labelFormat(String(label)) : label}</p> : null}
      <ul className="flex flex-col gap-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-3">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold tabular text-ink">{fmt(String(p.dataKey), Number(p.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items, className }: { items: { label: string; color: string; value?: ReactNode }[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-3', className)}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
          {i.value !== undefined ? <span className="font-semibold text-ink">{i.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}

interface CartesianProps<T> {
  data: T[];
  x: keyof T & string;
  series: Series[];
  height?: number;
  format?: Record<string, Fmt>;
  yFormat?: Fmt;
  rightFormat?: Fmt;
  legend?: boolean;
  className?: string;
}

/** Smooth area chart with soft gradient fills; supports a secondary right axis. */
export function AreaTrend<T extends object>({ data, x, series, height = 260, format, yFormat = (v) => formatNumber(v), rightFormat, legend = true, className }: CartesianProps<T>) {
  const id = useId().replace(/:/g, '');
  const hasRight = series.some((s) => s.right);
  return (
    <div className={className}>
      {legend && series.length > 1 ? <Legend className="mb-3" items={series.map((s, i) => ({ label: s.label, color: s.color ?? seriesPalette[i] }))} /> : null}
      <div style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: hasRight ? 0 : 6, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color ?? seriesPalette[i]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={s.color ?? seriesPalette[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="3 4" />
            <XAxis dataKey={x as string} tick={axisStyle} tickLine={false} axisLine={false} minTickGap={18} tickMargin={8} />
            <YAxis yAxisId="l" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={yFormat} width={54} />
            {hasRight ? <YAxis yAxisId="r" orientation="right" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={rightFormat ?? ((v: number) => formatNumber(v))} width={40} /> : null}
            <Tooltip content={<TooltipBox format={format} />} cursor={{ stroke: chartColors.grid, strokeWidth: 1 }} />
            {series.map((s, i) => (
              <Area
                key={s.key}
                yAxisId={s.right ? 'r' : 'l'}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color ?? seriesPalette[i]}
                strokeWidth={2.2}
                fill={`url(#${id}-${s.key})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                animationDuration={700}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function LineTrend<T extends object>({ data, x, series, height = 240, format, yFormat = (v) => formatNumber(v), legend = true, className, domain }: CartesianProps<T> & { domain?: [number, number] }) {
  return (
    <div className={className}>
      {legend && series.length > 1 ? <Legend className="mb-3" items={series.map((s, i) => ({ label: s.label, color: s.color ?? seriesPalette[i] }))} /> : null}
      <div style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="3 4" />
            <XAxis dataKey={x as string} tick={axisStyle} tickLine={false} axisLine={false} minTickGap={16} tickMargin={8} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={yFormat} width={48} domain={domain ?? ['auto', 'auto']} />
            <Tooltip content={<TooltipBox format={format} />} />
            {series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? seriesPalette[i]} strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} animationDuration={700} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Vertical (default) or horizontal bar chart; `stacked` stacks all series. */
export function BarSeries<T extends object>({ data, x, series, height = 260, format, yFormat = (v) => formatNumber(v), legend = true, horizontal, stacked, className, colorByIndex }: CartesianProps<T> & { horizontal?: boolean; stacked?: boolean; colorByIndex?: boolean }) {
  return (
    <div className={className}>
      {legend && series.length > 1 ? <Legend className="mb-3" items={series.map((s, i) => ({ label: s.label, color: s.color ?? seriesPalette[i] }))} /> : null}
      <div style={{ height }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} barCategoryGap={horizontal ? '28%' : '22%'}>
            <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke={chartColors.grid} strokeDasharray="3 4" />
            {horizontal ? (
              <>
                <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={yFormat} />
                <YAxis type="category" dataKey={x as string} tick={axisStyle} tickLine={false} axisLine={false} width={112} />
              </>
            ) : (
              <>
                <XAxis dataKey={x as string} tick={axisStyle} tickLine={false} axisLine={false} minTickGap={8} tickMargin={8} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={yFormat} width={50} />
              </>
            )}
            <Tooltip content={<TooltipBox format={format} />} cursor={{ fill: 'var(--surface-3)', opacity: 0.6 }} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? seriesPalette[i]} stackId={stacked ? 'a' : undefined} radius={stacked ? (i === series.length - 1 ? (horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]) : 0) : horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={38} animationDuration={700}>
                {colorByIndex && series.length === 1 ? data.map((_, k) => <Cell key={k} fill={seriesPalette[k % seriesPalette.length]} />) : null}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Donut with a centred total and a value legend. */
export function Donut({ data, height = 200, format = (v) => formatNumber(v), centerLabel, centerValue, className }: { data: { name: string; value: number; color?: string }[]; height?: number; format?: Fmt; centerLabel?: string; centerValue?: ReactNode; className?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const colored = data.map((d, i) => ({ ...d, color: d.color ?? seriesPalette[i % seriesPalette.length] }));
  return (
    <div className={cn('@container', className)}>
    <div className="flex flex-col items-center gap-4 @[440px]:flex-row">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<TooltipBox format={format} />} />
            <Pie data={colored} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" animationDuration={700}>
              {colored.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular text-ink">{centerValue ?? formatNumber(total)}</span>
          {centerLabel ? <span className="text-xs text-ink-3">{centerLabel}</span> : null}
        </div>
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-2">
        {colored.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{d.name}</span>
            <span className="font-semibold tabular text-ink">{format(d.value)}</span>
            <span className="w-10 text-right text-xs tabular text-ink-3">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}

/** Weekday × hour heatmap (CSS grid, scales colour by value). */
export function Heatmap({ rows, columns, className }: { rows: { label: string; values: number[] }[]; columns: string[]; className?: string }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  return (
    <div className={cn('overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full min-w-[520px] border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-10" />
            {columns.map((c) => (
              <th key={c} scope="col" className="font-medium text-ink-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="pr-1 text-left font-medium text-ink-3">
                {r.label}
              </th>
              {r.values.map((v, i) => (
                <td key={i} title={`${r.label} ${columns[i]}: ${v}`} className="h-7 rounded-md text-center font-semibold tabular" style={{ background: v ? `color-mix(in oklab, var(--panel-solid) ${Math.round(12 + (v / max) * 80)}%, transparent)` : 'var(--surface-2)', color: v / max > 0.55 ? '#fff' : 'var(--ink-2)' }}>
                  {v || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Conversion funnel as stepped horizontal bars with drop-off. */
export function Funnel({ steps, className }: { steps: { stage: string; value: number }[]; className?: string }) {
  const top = steps[0]?.value || 1;
  return (
    <ol className={cn('flex flex-col gap-3', className)}>
      {steps.map((s, i) => {
        const pct = s.value / top;
        const prev = i ? steps[i - 1].value : s.value;
        return (
          <li key={s.stage}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{s.stage}</span>
              <span className="tabular text-ink-3">
                <span className="font-semibold text-ink">{formatNumber(s.value)}</span> <span className="ml-1">{Math.round(pct * 100)}%</span>{i ? <span className="ml-1.5 text-danger-500">−{prev ? Math.round(((prev - s.value) / prev) * 100) : 0}%</span> : null}
              </span>
            </div>
            <div className="h-7 overflow-hidden rounded-lg bg-surface-3">
              <div className="h-full rounded-lg transition-[width] duration-700" style={{ width: `${Math.max(pct * 100, 2)}%`, background: seriesPalette[i % seriesPalette.length] }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
