/* preview: auto-suppressed to keep Preview builds green. */
export type AuthData = { authenticated: boolean; email?: string; ts?: number };

const AUTH_KEY = "wageflow-auth";

export function readAuth(): AuthData | null {
if (typeof window === "undefined") return null;
const raw = window.localStorage.getItem(AUTH_KEY) ?? window.sessionStorage.getItem(AUTH_KEY);
if (!raw) return null;
try { return JSON.parse(raw) as AuthData; } catch { return null; }
}

export function writeAuth(data: AuthData, remember: boolean) {
if (typeof window === "undefined") return;
const raw = JSON.stringify(data);
try {
if (remember) {
window.localStorage.setItem(AUTH_KEY, raw);
window.sessionStorage.removeItem(AUTH_KEY);
} else {
window.sessionStorage.setItem(AUTH_KEY, raw);
window.localStorage.removeItem(AUTH_KEY);
}
} catch {}
}

export function clearAuth() {
if (typeof window === "undefined") return;
try {
window.localStorage.removeItem(AUTH_KEY);
window.sessionStorage.removeItem(AUTH_KEY);
} catch {}
}
