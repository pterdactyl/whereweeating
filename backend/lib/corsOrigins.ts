/** Origins allowed for cross-origin browser requests (local dev + optional FRONTEND_URL). */
export function buildAllowedOrigins(): string[] {
  return [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter((v): v is string => Boolean(v))
}

export function isAllowedCorsOrigin(origin: string, allowed: string[]): boolean {
  if (allowed.includes(origin)) return true

  // Vercel preview and production deployments (*.vercel.app + VERCEL_URL host)
  if (process.env.VERCEL === '1') {
    try {
      const host = new URL(origin).host
      if (host.endsWith('.vercel.app')) return true
      const deploymentHost = process.env.VERCEL_URL
      if (deploymentHost && host === deploymentHost) return true
    } catch {
      return false
    }
  }

  return false
}
