// API client with retry logic, heartbeat, localStorage fallback, and auth token support

// Production: read from meta tag or env var; dev fallback to localhost
const API_BASE = (() => {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="tj-api-base"]');
    if (meta?.getAttribute('content')) return meta.getAttribute('content')!;
  }
  return 'http://localhost:3001/api';
})();

// PHP backend uses ?r=path format; Node.js uses /api/path format
const IS_PHP = API_BASE.includes('api.php');

function apiUrl(path: string): string {
  if (IS_PHP) {
    const [route, query] = path.split('?');
    const cleanPath = route.replace(/^\//, '');
    return `${API_BASE}?r=${encodeURIComponent(cleanPath)}${query ? `&${query}` : ''}`;
  }
  return `${API_BASE}${path}`;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

let _saveStatusCallback: ((status: SaveStatus) => void) | null = null;
let _connectionCallback: ((online: boolean) => void) | null = null;
let _isOnline = true;
let _authToken: string | null = null;

export function setSaveStatusCallback(cb: (status: SaveStatus) => void) {
  _saveStatusCallback = cb;
}

export function setConnectionCallback(cb: (online: boolean) => void) {
  _connectionCallback = cb;
}

export function getIsOnline() {
  return _isOnline;
}

export function setAuthToken(token: string | null) {
  _authToken = token;
  if (token) {
    localStorage.setItem('tj_session_token', token);
  } else {
    localStorage.removeItem('tj_session_token');
  }
}

export function getAuthToken(): string | null {
  if (_authToken) return _authToken;
  _authToken = localStorage.getItem('tj_session_token');
  return _authToken;
}

function notifySaveStatus(status: SaveStatus) {
  if (_saveStatusCallback) _saveStatusCallback(status);
}

function notifyConnection(online: boolean) {
  if (_isOnline !== online) {
    _isOnline = online;
    if (_connectionCallback) _connectionCallback(online);
  }
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ── Retry with exponential backoff ──────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { ...options, signal: options.signal || controller.signal });
      clearTimeout(timeout);
      notifyConnection(true);
      return res;
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  notifyConnection(false);
  throw lastError;
}

// ── localStorage fallback queue ─────────────────────────────────────────────

interface PendingRequest {
  id: string;
  url: string;
  method: string;
  body: string;
  timestamp: number;
}

const PENDING_KEY = 'tj_pending_requests';

function getPendingRequests(): PendingRequest[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePendingRequest(req: PendingRequest) {
  const pending = getPendingRequests();
  pending.push(req);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

function clearPendingRequests() {
  localStorage.removeItem(PENDING_KEY);
}

export async function syncPendingRequests() {
  const pending = getPendingRequests();
  if (pending.length === 0) return;

  const failed: PendingRequest[] = [];
  for (const req of pending) {
    try {
      await fetch(req.url, {
        method: req.method,
        headers: getHeaders(),
        body: req.body,
      });
    } catch {
      failed.push(req);
    }
  }

  if (failed.length > 0) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(failed));
  } else {
    clearPendingRequests();
  }
}

// ── Heartbeat ───────────────────────────────────────────────────────────────

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(async () => {
    try {
      const res = await fetch(apiUrl('/health'), { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        notifyConnection(true);
        await syncPendingRequests();
      } else {
        notifyConnection(false);
      }
    } catch {
      notifyConnection(false);
    }
  }, 30000);
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ── 401 handler ─────────────────────────────────────────────────────────────

const configuredBasePath = import.meta.env.VITE_BASE_PATH || import.meta.env.BASE_URL;
const basePathSegment = configuredBasePath.replace(/^\/|\/$/g, '');
const BASE_PATH = basePathSegment ? `/${basePathSegment}/` : '/';

function handle401(res: Response): void {
  if (res.status === 401) {
    localStorage.removeItem('tj_session_token');
    localStorage.removeItem('tj_user_id');
    window.location.href = BASE_PATH;
  }
}

// ── API methods ─────────────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(apiUrl(path), { headers: getHeaders() });
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await fetchWithRetry(apiUrl(path), { headers: getHeaders() });
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  notifySaveStatus('saving');
  try {
    const res = await fetchWithRetry(apiUrl(path), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      handle401(res);
      const err = await res.json().catch(() => ({ error: 'Error de red' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    notifySaveStatus('saved');
    setTimeout(() => notifySaveStatus('idle'), 2000);
    return res.json();
  } catch (err) {
    savePendingRequest({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: apiUrl(path),
      method: 'POST',
      body: JSON.stringify(data),
      timestamp: Date.now(),
    });
    notifySaveStatus('error');
    throw err;
  }
}

export async function apiPut<T>(path: string, data: unknown): Promise<T> {
  notifySaveStatus('saving');
  try {
    const res = await fetchWithRetry(apiUrl(path), {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      handle401(res);
      const err = await res.json().catch(() => ({ error: 'Error de red' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    notifySaveStatus('saved');
    setTimeout(() => notifySaveStatus('idle'), 2000);
    return res.json();
  } catch (err) {
    savePendingRequest({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: apiUrl(path),
      method: 'PUT',
      body: JSON.stringify(data),
      timestamp: Date.now(),
    });
    notifySaveStatus('error');
    throw err;
  }
}

export async function apiDelete(path: string): Promise<void> {
  notifySaveStatus('saving');
  try {
    const res = await fetchWithRetry(apiUrl(path), {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      handle401(res);
      const err = await res.json().catch(() => ({ error: 'Error de red' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    notifySaveStatus('saved');
    setTimeout(() => notifySaveStatus('idle'), 2000);
  } catch (err) {
    notifySaveStatus('error');
    throw err;
  }
}
