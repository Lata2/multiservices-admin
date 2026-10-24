import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, IconButton } from './Button';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
let openCount = 0;

/** Focus trap + Escape + scroll lock + focus restore. */
function useModalBehaviour(open: boolean, onClose: () => void, ref: RefObject<HTMLDivElement | null>) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    openCount += 1;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const el = ref.current;
      const auto = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>('input,textarea,select') ?? el;
      auto?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === 'Tab' && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      openCount -= 1;
      if (!openCount) document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, ref]);
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/** Centered dialog on ≥sm; bottom sheet on phones. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useModalBehaviour(open, onClose, ref);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-overlay backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        tabIndex={-1}
        className={cn('relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-lg outline-none animate-sheet-up sm:animate-pop-in sm:rounded-2xl', widths[size])}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 pb-3.5 pt-4">
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-t`} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-ink-3">{description}</p> : null}
          </div>
          <IconButton icon={X} label="Close" size="sm" onClick={onClose} className="-mr-1.5" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer ? <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Right-side panel for record details/editing; full-screen on phones. */
export function Drawer({ open, onClose, title, description, children, footer, width = 'md' }: Omit<DialogProps, 'size'> & { width?: 'md' | 'lg' }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useModalBehaviour(open, onClose, ref);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-overlay" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} tabIndex={-1} className={cn('relative flex h-full w-full flex-col border-l border-line bg-surface shadow-lg outline-none animate-drawer-right', width === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-t`} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-ink-3">{description}</p> : null}
          </div>
          <IconButton icon={X} label="Close" size="sm" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer ? <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  icon?: LucideIcon;
  children?: ReactNode;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, tone = 'primary', loading, icon: I = AlertTriangle, children, confirmDisabled }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2.5">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone === 'danger' ? 'bg-danger-50 text-danger-600 dark:bg-danger-500/15' : 'bg-panel-soft text-panel-ink')}>
            <I size={17} />
          </span>
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'panel'} loading={loading} disabled={confirmDisabled} onClick={onConfirm} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message ? <div className="text-base text-ink-2">{message}</div> : null}
      {children ? <div className={cn(message && 'mt-4', 'flex flex-col gap-3')}>{children}</div> : null}
    </Dialog>
  );
}
