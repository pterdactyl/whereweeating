export function requireEnv(name) {
  const raw = process.env[name];
  const value = typeof raw === "string" ? raw.trim() : raw;
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to backend/.env before running this script.`,
    );
  }
  return value;
}
