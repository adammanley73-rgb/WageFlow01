/* @ts-nocheck */
export async function ensureStoreReady(){ return true; }
export async function readAbsences(){ return []; }
export async function writeAbsences(absences:any){ return absences ?? []; }
export function fireRefresh(){ /* no-op */ }
export default { ensureStoreReady, readAbsences, writeAbsences, fireRefresh };
