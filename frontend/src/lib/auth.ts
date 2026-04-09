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

