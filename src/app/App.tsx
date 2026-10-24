import { lazy, Suspense, useEffect } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from '@/components/ui';
import { env } from '@/config/env';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { applyTheme, useUiStore } from '@/store/ui.store';
import { qk } from '@/hooks/queryKeys';
import { queryClient } from './queryClient';
import { router } from './router';

const Devtools = env.isDev && env.queryDevtools ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))) : null;

/** Re-validates the stored session on load and keeps role/permissions fresh. */
function SessionSync() {
  const token = useAuthStore((s) => s.token);
  const setAdmin = useAuthStore((s) => s.setAdmin);
  const me = useQuery({ queryKey: qk.me, queryFn: authApi.me, enabled: !!token, staleTime: 60_000 });
  useEffect(() => {
    if (me.data) setAdmin(me.data);
  }, [me.data, setAdmin]);
  return null;
}

function ThemeSync() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme('system');
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [theme]);
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <SessionSync />
      <RouterProvider router={router} />
      <Toaster />
      {Devtools ? (
        <Suspense>
          <Devtools buttonPosition="bottom-left" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
}
