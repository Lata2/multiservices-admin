/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_REQUEST_TIMEOUT_MS?: string;
  readonly VITE_MOCK_LATENCY?: string;
  readonly VITE_MOCK_PERSIST?: string;
  readonly VITE_QUERY_DEVTOOLS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
