/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the chesseval-server (Express) REST API. Game history is disabled when unset. */
  readonly VITE_API_URL?: string;
  /** URL of the chesseval online-server (FastAPI) WebSocket relay. Online play is disabled when unset. */
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
