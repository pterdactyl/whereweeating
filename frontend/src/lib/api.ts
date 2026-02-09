export const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE || !/^https?:\/\//.test(API_BASE)) {
  throw new Error(`Bad VITE_API_BASE_URL: "${API_BASE}"`);
}

export const apiUrl = (path: string) => {
  const base = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;
  const clean = path.replace(/^\//, "");
  return new URL(clean, base).toString();
};