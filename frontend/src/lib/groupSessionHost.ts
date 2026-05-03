function hostClaimKey(sessionId: string): string {
  return `group_host_claim_${sessionId}`;
}

export function setStoredHostClaim(sessionId: string, secret: string): void {
  try {
    sessionStorage.setItem(hostClaimKey(sessionId), secret);
  } catch {
    /* ignore */
  }
}

export function getStoredHostClaim(sessionId: string): string | null {
  try {
    return sessionStorage.getItem(hostClaimKey(sessionId));
  } catch {
    return null;
  }
}

export function clearStoredHostClaim(sessionId: string): void {
  try {
    sessionStorage.removeItem(hostClaimKey(sessionId));
  } catch {
    /* ignore */
  }
}
