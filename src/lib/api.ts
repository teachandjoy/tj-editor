// API client with retry logic, heartbeat, localStorage fallback, and auth token support

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

// Backend base (without /api) for serving static files like /media/
export const BACKEND_BASE = API_BASE.replace(/\/api$/, '');

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
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
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

// ── API methods ─────────────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(`${API_BASE}${path}`, { headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  notifySaveStatus('saving');
  try {
    const res = await fetchWithRetry(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error de red' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    notifySaveStatus('saved');
    setTimeout(() => notifySaveStatus('idle'), 2000);
    return res.json();
  } catch (err) {
    savePendingRequest({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: `${API_BASE}${path}`,
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
    const res = await fetchWithRetry(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error de red' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    notifySaveStatus('saved');
    setTimeout(() => notifySaveStatus('idle'), 2000);
    return res.json();
  } catch (err) {
    savePendingRequest({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: `${API_BASE}${path}`,
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
    const res = await fetchWithRetry(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
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

// ── File upload (multipart/form-data) ────────────────────────────────────────

export async function apiUploadFile<T>(path: string, formData: FormData): Promise<T> {
  notifySaveStatus('saving');
  try {
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Do NOT set Content-Type — browser sets multipart boundary automatically
    const res = await fetchWithRetry(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error de red' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    notifySaveStatus('saved');
    setTimeout(() => notifySaveStatus('idle'), 2000);
    return res.json();
  } catch (err) {
    notifySaveStatus('error');
    throw err;
  }
}

export async function apiUploadFilePut<T>(path: string, formData: FormData): Promise<T> {
  notifySaveStatus('saving');
  try {
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetchWithRetry(`${API_BASE}${path}`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error de red' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    notifySaveStatus('saved');
    setTimeout(() => notifySaveStatus('idle'), 2000);
    return res.json();
  } catch (err) {
    notifySaveStatus('error');
    throw err;
  }
}
