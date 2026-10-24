import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToastStore, type ToastTone } from '@/store/toast.store';

const icons: Record<ToastTone, { I: typeof Info; cls: string }> = {
  success: { I: CheckCircle2, cls: 'text-success-500' },
  error: { I: XCircle, cls: 'text-danger-500' },
  info: { I: Info, cls: 'text-primary-500' },
  warning: { I: AlertTriangle, cls: 'text-warning-500' },
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end">
      {toasts.map((t) => {
        const { I, cls } = icons[t.tone];
        return (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-lg">
            <I size={18} className={cn('mt-px shrink-0', cls)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-sm text-ink-3">{t.description}</p> : null}
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="focus-ring rounded text-ink-3 hover:text-ink">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
