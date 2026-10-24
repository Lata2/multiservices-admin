import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'panel' | 'soft' | 'outline' | 'ghost' | 'danger' | 'success' | 'subtle';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 text-white shadow-sm hover:bg-primary-600 hover:shadow-brand',
  panel: 'panel-gradient text-white shadow-sm hover:brightness-110',
  soft: 'bg-panel-soft text-panel-ink hover:brightness-95 dark:hover:brightness-125',
  outline: 'border border-line-strong bg-surface text-ink hover:border-primary-300 hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
  subtle: 'bg-surface-3 text-ink hover:bg-line',
  danger: 'bg-danger-500 text-white shadow-sm hover:bg-danger-600',
  success: 'bg-success-500 text-white shadow-sm hover:bg-success-600',
};
const sizes: Record<ButtonSize, { box: string; icon: number }> = {
  xs: { box: 'h-7 gap-1 rounded-md px-2.5 text-xs', icon: 13 },
  sm: { box: 'h-8 gap-1.5 rounded-lg px-3 text-sm', icon: 14 },
  md: { box: 'h-9.5 gap-2 rounded-lg px-4 text-base', icon: 16 },
  lg: { box: 'h-11 gap-2 rounded-xl px-5 text-md', icon: 18 },
};

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

export const buttonClasses = ({ variant = 'primary', size = 'md', fullWidth, className }: StyleProps) =>
  cn(
    'focus-ring inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size].box,
    fullWidth && 'w-full',
    className,
  );

function Inner({ loading, icon: L, iconRight: R, size = 'md', children }: { loading?: boolean; icon?: LucideIcon; iconRight?: LucideIcon; size?: ButtonSize; children?: ReactNode }) {
  const s = sizes[size].icon;
  return (
    <>
      {loading ? <Loader2 size={s} className="animate-spin" aria-hidden /> : L ? <L size={s} aria-hidden /> : null}
      {children ? <span className="truncate">{children}</span> : null}
      {R && !loading ? <R size={s} aria-hidden /> : null}
    </>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, fullWidth, className, loading, icon, iconRight, children, disabled, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      <Inner loading={loading} icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Inner>
    </button>
  );
});

export interface LinkButtonProps extends Omit<LinkProps, 'className'>, StyleProps {
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export function LinkButton({ variant, size, fullWidth, className, icon, iconRight, children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      <Inner icon={icon} iconRight={iconRight} size={size}>
        {children as ReactNode}
      </Inner>
    </Link>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'ghost' | 'outline' | 'soft' | 'solid' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  badge?: number | boolean;
}

const iconVariants = {
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
  outline: 'border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
  soft: 'bg-surface-3 text-ink-2 hover:text-ink hover:bg-line',
  solid: 'panel-gradient text-white hover:brightness-110',
  danger: 'text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/15',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ icon: I, label, variant = 'ghost', size = 'md', badge, className, type = 'button', ...rest }, ref) {
  const box = size === 'xs' ? 'h-7 w-7 rounded-md' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9.5 w-9.5 rounded-lg';
  return (
    <button ref={ref} type={type} aria-label={label} title={label} className={cn('focus-ring relative inline-flex shrink-0 items-center justify-center transition-colors active:scale-95 disabled:pointer-events-none disabled:opacity-40', box, iconVariants[variant], className)} {...rest}>
      <I size={size === 'md' ? 18 : size === 'sm' ? 16 : 14} aria-hidden />
      {badge ? (
        typeof badge === 'number' ? (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-surface bg-danger-500 px-1 text-2xs font-bold text-white">{badge > 99 ? '99+' : badge}</span>
        ) : (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-surface bg-danger-500" />
        )
      ) : null}
    </button>
  );
});
