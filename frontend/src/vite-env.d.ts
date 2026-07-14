/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_RUN_LIVE_SERVICE_TESTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
