/** Login helpers with no server-only dependencies, so client code can use them too. */

/** GitHub logins are case-insensitive; rows store them lowercase. */
export function normaliseLogin(raw: string): string {
  return raw.trim().toLowerCase();
}

/** GitHub's own rule: alphanumerics and single hyphens, up to 39 characters. */
export function isPlausibleLogin(login: string): boolean {
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/.test(login);
}
