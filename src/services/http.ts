import { env } from '@/config/env';
import { session } from './session';

/** Typed error thrown by every service call (mock or real) so screens render consistent error states. */
export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string>;
  constructor(message: string, status = 400, code = 'BAD_REQUEST', fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
export const isUnauthenticated = (e: unknown) => isApiError(e) && e.status === 401;

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.') {
  if (isApiError(e)) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Real HTTP client for the production backend (used when `VITE_USE_MOCKS=false`).
 * Each service module calls either `http()` or its mock implementation.
 */
export async function http<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const base = env.apiBaseUrl.endsWith('/') ? env.apiBaseUrl : `${env.apiBaseUrl}/`;
  const url = new URL(path.replace(/^\//, ''), base);
  Object.entries(opts.query ?? {}).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && url.searchParams.set(k, String(v)));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? env.requestTimeoutMs);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
      credentials: 'include',
    });
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    const timedOut = controller.signal.aborted;
    throw new ApiError(timedOut ? 'The server took too long to respond.' : 'Unable to reach the server. Check your connection.', 0, timedOut ? 'TIMEOUT' : 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }

  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = res.status === 401 ? 'UNAUTHENTICATED' : res.status === 403 ? 'FORBIDDEN' : (data?.code ?? 'HTTP_ERROR');
    throw new ApiError(data?.message ?? 'Something went wrong', res.status, code, data?.errors);
  }
  return data as T;
}
