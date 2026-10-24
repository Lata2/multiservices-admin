/**
 * JS-side theme config. Colours reference the CSS variables declared in
 * `src/styles/theme.css`, so charts and canvas-like widgets follow the same
 * tokens (and dark mode) as the rest of the UI. Edit tokens there, not here.
 */
export const chartColors = {
  primary: 'var(--color-primary-500)',
  primarySoft: 'var(--color-primary-200)',
  accent: 'var(--color-accent-500)',
  success: 'var(--color-success-500)',
  warning: 'var(--color-warning-500)',
  danger: 'var(--color-danger-500)',
  info: 'var(--color-info-500)',
  highlight: 'var(--color-highlight-500)',
  teal: 'var(--color-teal-500)',
  pink: 'var(--color-pink-500)',
  grid: 'var(--line)',
  axis: 'var(--ink-3)',
  panel: 'var(--panel-solid)',
} as const;

/** Ordered categorical palette for multi-series charts (distinct hues, checked for contrast in both themes). */
export const seriesPalette = [
  chartColors.primary,
  chartColors.accent,
  chartColors.success,
  chartColors.highlight,
  chartColors.info,
  chartColors.pink,
  chartColors.teal,
  chartColors.danger,
] as const;

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'highlight';

/** Soft (tinted background) + solid classes per tone — used by badges, stat icons, avatars. */
export const toneClasses: Record<Tone, { soft: string; solid: string; text: string; dot: string }> = {
  neutral: { soft: 'bg-surface-3 text-ink-2', solid: 'bg-neutral-600 text-white', text: 'text-ink-2', dot: 'bg-neutral-400' },
  primary: { soft: 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200', solid: 'bg-primary-500 text-white', text: 'text-primary-600 dark:text-primary-300', dot: 'bg-primary-500' },
  success: { soft: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400', solid: 'bg-success-500 text-white', text: 'text-success-600 dark:text-success-400', dot: 'bg-success-500' },
  warning: { soft: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400', solid: 'bg-warning-500 text-white', text: 'text-warning-600 dark:text-warning-400', dot: 'bg-warning-500' },
  danger: { soft: 'bg-danger-50 text-danger-700 dark:bg-danger-500/15 dark:text-danger-400', solid: 'bg-danger-500 text-white', text: 'text-danger-600 dark:text-danger-400', dot: 'bg-danger-500' },
  info: { soft: 'bg-info-50 text-info-700 dark:bg-info-500/15 dark:text-info-400', solid: 'bg-info-500 text-white', text: 'text-info-600 dark:text-info-400', dot: 'bg-info-500' },
  accent: { soft: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300', solid: 'bg-accent-500 text-white', text: 'text-accent-600 dark:text-accent-400', dot: 'bg-accent-500' },
  highlight: { soft: 'bg-highlight-50 text-highlight-700 dark:bg-highlight-500/15 dark:text-highlight-200', solid: 'bg-highlight-500 text-white', text: 'text-highlight-600 dark:text-highlight-400', dot: 'bg-highlight-500' },
};

/** Gradients for KPI icon tiles (colourful but on-brand). */
export const toneGradient: Record<Tone, string> = {
  neutral: 'from-neutral-400 to-neutral-600',
  primary: 'from-primary-400 to-primary-700',
  success: 'from-success-400 to-success-600',
  warning: 'from-warning-400 to-warning-600',
  danger: 'from-danger-400 to-danger-600',
  info: 'from-info-400 to-info-600',
  accent: 'from-accent-300 to-accent-600',
  highlight: 'from-highlight-400 to-highlight-700',
};
