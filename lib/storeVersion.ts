/* @ts-nocheck */
/**
 * Preview-safe shim for absence storage and version helpers.
 * Exports expected by pages:
 *   ensureStoreReady, readAbsences, writeAbsences
 * Also provides getStoreVersion, bumpStoreVersion, storeVersion, default export.
 * No real persistence. In-memory only.
 */

const VERSION = "preview-0"

// tiny state bucket to survive hot reloads in dev
const G = globalThis as any
if (!G.__WF_PREVIEW__) G.__WF_PREVIEW__ = {}
if (!G.__WF_PREVIEW__.absences) G.__WF_PREVIEW__.absences = []

export function getStoreVersion(): string {
  return VERSION
}

export async function bumpStoreVersion(): Promise<string> {
  return VERSION
}

export const storeVersion = VERSION
export default VERSION

/** Always resolves true. Creates preview buckets if missing. */
export async function ensureStoreReady(): Promise<boolean> {
  if (!G.__WF_PREVIEW__) G.__WF_PREVIEW__ = {}
  if (!G.__WF_PREVIEW__.absences) G.__WF_PREVIEW__.absences = []
  return true
}

/** Returns a shallow copy for UI preview. */
export async function readAbsences(): Promise<any[]> {
  await ensureStoreReady()
  const list = G.__WF_PREVIEW__.absences || []
  return Array.isArray(list) ? [...list] : []
}

/**
 * Replaces the preview absences list.
 * Accepts array or single item. Returns the new list.
 */
export async function writeAbsences(input: any | any[]): Promise<any[]> {
  await ensureStoreReady()
  const next = Array.isArray(input) ? input : [input]
  G.__WF_PREVIEW__.absences = next.filter(Boolean)
  return [...G.__WF_PREVIEW__.absences]
}
