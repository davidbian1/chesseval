/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the chesseval-server API. Game history is disabled when unset. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
