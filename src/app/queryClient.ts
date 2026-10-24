import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isApiError, isUnauthenticated } from '@/services/http';
import { useAuthStore } from '@/store/auth.store';

function handleAuthError(e: unknown) {
  if (isUnauthenticated(e) && useAuthStore.getState().token) useAuthStore.getState().signOut();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors (validation, 401/403/404); retry network/5xx twice.
      retry: (count, e) => (isApiError(e) && e.status >= 400 && e.status < 500 ? false : count < 2),
    },
    mutations: { retry: false },
  },
});
