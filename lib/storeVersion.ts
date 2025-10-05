/**
 * Stub storage helpers for preview builds.
 * Provides version bump and absence read/write operations in memory.
 */

const VERSION = 'preview-0';

const G = globalThis as any;
if (!G.__WF_PREVIEW__) G.__WF_PREVIEW__ = {};
if (!G.__WF_PREVIEW__.absences) G.__WF_PREVIEW__.absences = [];

export const storeVersion = VERSION;

export function getStoreVersion(): string {
  return VERSION;
}

export async function bumpStoreVersion(): Promise<string> {
  return VERSION;
}

export async function ensureStoreReady(): Promise<boolean> {
  if (!G.__WF_PREVIEW__) G.__WF_PREVIEW__ = {};
  if (!G.__WF_PREVIEW__.absences) G.__WF_PREVIEW__.absences = [];
  return true;
}

export async function readAbsences(): Promise<any[]> {
  await ensureStoreReady();
  const list = G.__WF_PREVIEW__.absences || [];
  return Array.isArray(list) ? [...list] : [];
}

export async function writeAbsences(input: any | any[]): Promise<any[]> {
  await ensureStoreReady();
  const next = Array.isArray(input) ? input : [input];
  G.__WF_PREVIEW__.absences = next.filter(Boolean);
  return [...G.__WF_PREVIEW__.absences];
}

export default VERSION;
