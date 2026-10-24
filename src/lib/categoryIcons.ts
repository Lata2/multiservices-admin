import { Bug, Car, Droplet, Flower, Hammer, Leaf, PaintRoller, Scissors, Shirt, Snowflake, Sparkles, Wrench, Zap, type LucideIcon } from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  snowflake: Snowflake,
  zap: Zap,
  droplet: Droplet,
  flower: Flower,
  scissors: Scissors,
  'paint-roller': PaintRoller,
  bug: Bug,
  hammer: Hammer,
  shirt: Shirt,
  car: Car,
  leaf: Leaf,
  wrench: Wrench,
};

export const categoryIcon = (name: string): LucideIcon => CATEGORY_ICONS[name] ?? Wrench;

const TINTS = ['tint-primary', 'tint-accent', 'tint-success', 'tint-highlight', 'tint-info', 'tint-danger'] as const;
export const TINT_CLASSES: Record<(typeof TINTS)[number], string> = {
  'tint-primary': 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
  'tint-accent': 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
  'tint-success': 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400',
  'tint-highlight': 'bg-highlight-50 text-highlight-600 dark:bg-highlight-500/15 dark:text-highlight-400',
  'tint-info': 'bg-info-50 text-info-600 dark:bg-info-500/15 dark:text-info-400',
  'tint-danger': 'bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-400',
};
export const tintFor = (i: number) => TINT_CLASSES[TINTS[i % TINTS.length]];
