/**
 * Runtime configuration. Vite inlines `VITE_*` variables at build time.
 * Never put secrets here: everything in this file ends up in the JS bundle.
 */
const e = import.meta.env;
const flag = (v: string | undefined, fallback: boolean) => (v === undefined || v === '' ? fallback : v === 'true' || v === '1');

export const env = {
  appName: e.VITE_APP_NAME || 'Servio Console',
  apiBaseUrl: e.VITE_API_URL ?? 'https://api.servio.app/v1/admin',
  /** When true every service resolves against the in-memory mock DB. */
  useMocks: flag(e.VITE_USE_MOCKS, true),
  /** Persist the mock DB in localStorage so demo changes survive reloads. */
  mockPersist: flag(e.VITE_MOCK_PERSIST, true),
  mockLatency: Number(e.VITE_MOCK_LATENCY ?? 350),
  requestTimeoutMs: Number(e.VITE_REQUEST_TIMEOUT_MS ?? 20_000),
  queryDevtools: flag(e.VITE_QUERY_DEVTOOLS, false),
  currency: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  /** Demo-only one-time code for the simulated 2-step verification. */
  demoOtp: '123456',
  demoPassword: 'Demo@1234',
  isDev: !!e.DEV,
} as const;
