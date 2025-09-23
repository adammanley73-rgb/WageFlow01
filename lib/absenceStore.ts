// lib/absenceStore.ts
export type AbsenceStatus = 'pending' | 'approved' | 'rejected';

export type AbsenceRecord = {
  id: string;
  employee: string;
  type: 'Holiday' | 'Sickness' | 'Other';
  startDate: string; // ISO date
  endDate: string;   // ISO date
  days: number;
  notes?: string;
  status: AbsenceStatus;
  createdAt: string; // ISO datetime
};

const KEY = 'wf_absences';

function read(): AbsenceRecord[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(KEY);
  try {
    return raw ? (JSON.parse(raw) as AbsenceRecord[]) : [];
  } catch {
    return [];
  }
}

function write(data: AbsenceRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function listAbsences(): AbsenceRecord[] {
  return read();
}

export function addAbsence(rec: Omit<AbsenceRecord, 'id' | 'createdAt' | 'status'> & { status?: AbsenceStatus }): AbsenceRecord {
  const data = read();
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  const createdAt = new Date().toISOString();
  const record: AbsenceRecord = { status: 'pending', createdAt, id, ...rec };
  data.unshift(record);
  write(data);
  return record;
}

export function setAbsenceStatus(id: string, status: AbsenceStatus): AbsenceRecord | null {
  const data = read();
  const idx = data.findIndex(a => a.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], status };
  write(data);
  return data[idx];
}

export function deleteAbsence(id: string): boolean {
  const data = read();
  const next = data.filter(a => a.id !== id);
  const changed = next.length !== data.length;
  if (changed) write(next);
  return changed;
}
