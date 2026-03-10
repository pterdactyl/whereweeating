import { createContext, useContext, useEffect, useState } from 'react';

const AuthVersionContext = createContext(0);

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'email') setVersion((v) => v + 1);
    };
    const onAuthChange = () => setVersion((v) => v + 1);
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-storage-changed', onAuthChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-storage-changed', onAuthChange);
    };
  }, []);

  return (
    <AuthVersionContext.Provider value={version}>
      {children}
    </AuthVersionContext.Provider>
  );
}

export function useAuthVersion() {
  return useContext(AuthVersionContext);
}

export function notifyAuthChange() {
  window.dispatchEvent(new CustomEvent('auth-storage-changed'));
}
