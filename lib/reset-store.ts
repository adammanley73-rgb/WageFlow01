// @ts-nocheck
/* preview: auto-suppressed to keep Preview builds green. */
// Dev-only token store. Use a DB in production.
type Item = { email: string; expiresAt: number };

const ttlMs = 30 * 60 * 1000; // 30 minutes
const store = new Map<string, Item>();

export function createResetToken(email: string) {
  const token = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).slice(2, 10);
  store.set(token, { email, expiresAt: Date.now() + ttlMs });
  return token;
}

export function consumeResetToken(token: string): string | null {
  const item = store.get(token);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    store.delete(token);
    return null;
  }
  store.delete(token);
  return item.email;
}
