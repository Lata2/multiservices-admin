import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { errorMessage } from '@/services/http';
import { toast } from '@/store/toast.store';

interface Options<TData, TVars> {
  invalidate?: QueryKey[];
  success?: string | ((data: TData, vars: TVars) => string);
  onSuccess?: (data: TData, vars: TVars) => void;
  onError?: (e: unknown) => void;
  /** Set false to handle errors inline (e.g. forms with field errors). */
  toastError?: boolean;
}

/** `useMutation` + cache invalidation + success/error toasts in one place. */
export function useApiMutation<TData, TVars = void>(fn: (vars: TVars) => Promise<TData>, opts: Options<TData, TVars> = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data, vars) => {
      await Promise.all((opts.invalidate ?? []).map((queryKey) => qc.invalidateQueries({ queryKey })));
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(data, vars) : opts.success);
      opts.onSuccess?.(data, vars);
    },
    onError: (e) => {
      if (opts.toastError !== false) toast.error(errorMessage(e));
      opts.onError?.(e);
    },
  });
}
