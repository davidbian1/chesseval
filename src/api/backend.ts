// Two independent services, deliberately: the games-history REST API
// (Express) and the online-play WebSocket relay (FastAPI) can be deployed
// separately, so each has its own env var and its own "is this configured"
// check rather than being derived from one shared URL.
const API_URL = import.meta.env.VITE_API_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

/** Whether the game-history REST API is configured (e.g. off for static deploys). */
export function isGameHistoryConfigured(): boolean {
  return Boolean(API_URL);
}

/** Whether the online-play WebSocket relay is configured (e.g. off for static deploys). */
export function isOnlinePlayConfigured(): boolean {
  return Boolean(WS_URL);
}

export function apiUrl(): string {
  if (!API_URL) throw new Error('VITE_API_URL is not configured');
  return API_URL;
}

export function wsUrl(): string {
  if (!WS_URL) throw new Error('VITE_WS_URL is not configured');
  return WS_URL;
}
