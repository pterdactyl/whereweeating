const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
const hasValidConfiguredBase = !!configuredBase && /^https?:\/\//.test(configuredBase);

if (configuredBase && !hasValidConfiguredBase) {
  console.warn(`Bad VITE_API_BASE_URL: "${configuredBase}". Falling back to current origin.`);
}

export const API_BASE =
  hasValidConfiguredBase
    ? configuredBase
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

export const apiUrl = (path: string) => {
  const base = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;
  const clean = path.replace(/^\//, "");
  return new URL(clean, base).toString();
};