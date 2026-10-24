import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Check, ChevronDown, Search, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export const controlClasses = (error?: boolean, className?: string) =>
  cn(
    'w-full min-w-0 rounded-lg border bg-surface px-3 text-base text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3',
    'hover:border-line-strong focus:outline-none focus:ring-3 focus:ring-primary-500/15 focus:border-primary-400',
    'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3',
    error ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/15' : 'border-line',
    className,
  );

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
  id?: string;
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, hint, error, required, className, children, id: idProp }: FieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-semibold text-ink-2">
          {label}
          {required ? <span className="ml-0.5 text-danger-500">*</span> : null}
        </label>
      ) : null}
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs font-medium text-danger-600 dark:text-danger-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  icon?: LucideIcon;
  suffix?: ReactNode;
  prefixText?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, icon: I, suffix, prefixText, containerClassName, className, required, id, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName} id={id}>
      {(fid, describedBy) => (
        <div className="relative flex items-center">
          {I ? <I size={16} className="pointer-events-none absolute left-3 text-ink-3" aria-hidden /> : null}
          {prefixText ? <span className="pointer-events-none absolute left-3 text-base text-ink-3">{prefixText}</span> : null}
          <input
            ref={ref}
            id={fid}
            required={required}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            className={controlClasses(!!error, cn('h-9.5', (I || prefixText) && 'pl-9', suffix && 'pr-10', className))}
            {...rest}
          />
          {suffix ? <span className="absolute right-3 text-sm text-ink-3">{suffix}</span> : null}
        </div>
      )}
    </Field>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, error, containerClassName, className, required, rows = 4, id, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName} id={id}>
      {(fid, describedBy) => (
        <textarea ref={ref} id={fid} rows={rows} required={required} aria-invalid={!!error || undefined} aria-describedby={describedBy} className={controlClasses(!!error, cn('resize-y py-2 leading-relaxed', className))} {...rest} />
      )}
    </Field>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  containerClassName?: string;
  size?: never;
  compact?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, options, placeholder, containerClassName, className, required, compact, id, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={containerClassName} id={id}>
      {(fid, describedBy) => (
        <div className="relative">
          <select
            ref={ref}
            id={fid}
            required={required}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            className={controlClasses(!!error, cn('appearance-none pr-9', compact ? 'h-8.5 text-sm' : 'h-9.5', className))}
            {...rest}
          >
            {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
        </div>
      )}
    </Field>
  );
});

export function SearchInput({ value, onChange, placeholder = 'Search', className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={cn('relative flex min-w-0 items-center', className)}>
      <Search size={15} className="pointer-events-none absolute left-3 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={controlClasses(false, 'h-8.5 pl-9 pr-8 text-sm [&::-webkit-search-cancel-button]:hidden')}
      />
      {value ? (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="focus-ring absolute right-2 rounded p-0.5 text-ink-3 hover:text-ink">
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled, size = 'md' }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'focus-ring relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
        checked ? 'bg-panel' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-spring)]',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          checked ? (size === 'sm' ? 'translate-x-4.5' : 'translate-x-5.5') : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/** Title + description + switch row for settings lists. */
export function SwitchRow({ title, description, checked, onChange, disabled, icon: I }: { title: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; icon?: LucideIcon }) {
  return (
    <div className="flex items-center gap-3 py-3">
      {I ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-ink-2">
          <I size={17} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        {description ? <p className="text-sm text-ink-3">{description}</p> : null}
      </div>
      <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

export function Checkbox({ checked, onChange, label, indeterminate, disabled, children, className }: { checked: boolean; onChange: (v: boolean) => void; label?: string; indeterminate?: boolean; disabled?: boolean; children?: ReactNode; className?: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-base', disabled && 'cursor-not-allowed opacity-50', className)}>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-label={label}
          ref={(el) => {
            if (el) el.indeterminate = !!indeterminate;
          }}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-4.5 w-4.5 cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-surface transition-colors checked:border-panel checked:bg-panel indeterminate:border-panel indeterminate:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed"
        />
        <Check size={13} strokeWidth={3} className="pointer-events-none absolute left-[2.5px] top-[2.5px] text-white opacity-0 peer-checked:opacity-100" />
        <span className="pointer-events-none absolute left-1 top-[8px] h-0.5 w-2.5 rounded bg-white opacity-0 peer-indeterminate:opacity-100" />
      </span>
      {children}
    </label>
  );
}

/** Pill-style single choice (filters, small option sets). */
export function Segmented<T extends string>({ value, onChange, options, label, size = 'md', className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; label: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-surface-3 p-0.5 scrollbar-none', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'focus-ring inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-all',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              active ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
            )}
          >
            {o.label}
            {o.count !== undefined ? <span className={cn('rounded-full px-1.5 text-2xs tabular', active ? 'bg-panel-soft text-panel-ink' : 'bg-line text-ink-3')}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chips (cities, channels, permissions). */
export function ChipGroup<T extends string>({ value, onChange, options, label }: { value: T[]; onChange: (v: T[]) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn('focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors', on ? 'border-transparent bg-panel-soft text-panel-ink' : 'border-line text-ink-2 hover:border-line-strong')}
          >
            {on ? <Check size={13} strokeWidth={3} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
