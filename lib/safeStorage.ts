// lib/safeStorage.ts
'use client';

/**
 * Safe JSON get with defaults. Never throws.
 */
export function readJSON<T>(
  key: string,
  opts?: { defaultValue: T; heal?: (v: unknown) => T }
): T {
  const def = opts?.defaultValue as T;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '' || raw === 'undefined' || raw === 'null') {
      return def;
    }
    const parsed = JSON.parse(raw);

    if (opts?.heal) {
      return opts.heal(parsed);
    }
    return parsed as T;
  } catch {
    return def;
  }
}

/**
 * Write JSON defensively. Never throws.
 */
export function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/sandbox issues in the demo.
  }
}
