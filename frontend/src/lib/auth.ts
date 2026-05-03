type AuthScope = 'local' | 'tab' | 'all';

function safeGet(storage: Storage | null, key: string): string | null {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(storage: Storage | null, key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
   
  }
}

function safeRemove(storage: Storage | null, key: string) {
  try {
    storage?.removeItem(key);
  } catch {

  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return safeGet(window.sessionStorage, 'token');
}

export function getAuthEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return safeGet(window.sessionStorage, 'email');
}

/** JWT payload only — host checks are enforced on the server. */
export function getAuthUserId(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { userID?: string };
    return payload.userID ?? null;
  } catch {
    return null;
  }
}

export function hasTabScopedAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(safeGet(window.sessionStorage, 'token'));
}

export function setAuth(params: { token: string; email: string; scope: Exclude<AuthScope, 'all'> }) {
  if (typeof window === 'undefined') return;
  const storage = params.scope === 'tab' ? window.sessionStorage : window.localStorage;
  safeSet(storage, 'token', params.token);
  safeSet(storage, 'email', params.email);
  if (params.scope === 'tab') {
    safeRemove(window.localStorage, 'token');
    safeRemove(window.localStorage, 'email');
  }
}

export function clearAuth(scope: AuthScope = 'all') {
  if (typeof window === 'undefined') return;
  if (scope === 'tab' || scope === 'all') {
    safeRemove(window.sessionStorage, 'token');
    safeRemove(window.sessionStorage, 'email');
  }
  if (scope === 'local' || scope === 'all') {
    safeRemove(window.localStorage, 'token');
    safeRemove(window.localStorage, 'email');
  }
}

