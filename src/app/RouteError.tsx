import { isRouteErrorResponse, useRouteError } from 'react-router';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui';

export function RouteError() {
  const err = useRouteError();
  const msg = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : 'Unexpected error';
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-2xl font-bold text-ink">Something broke on this page</p>
      <p className="max-w-md text-sm text-ink-3">{msg}</p>
      <Button icon={RotateCw} onClick={() => window.location.reload()}>
        Reload
      </Button>
    </div>
  );
}
