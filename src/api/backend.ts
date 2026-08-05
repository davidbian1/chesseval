const API_URL = import.meta.env.VITE_API_URL;

/** Whether a chesseval-server backend is configured — history and online play are no-ops without one (e.g. static deploys). */
export function isBackendConfigured(): boolean {
  return Boolean(API_URL);
}

export function apiUrl(): string {
  if (!API_URL) throw new Error('VITE_API_URL is not configured');
  return API_URL;
}

export function wsUrl(): string {
  return apiUrl().replace(/^http/, 'ws');
}
