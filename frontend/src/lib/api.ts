export const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  throw new Error("Missing VITE_API_BASE_URL (set it in Vercel and redeploy).");
}
