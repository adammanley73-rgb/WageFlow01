// Temporary stub to unblock deploy. Replace with real SMP logic later.
export type SmpResult = {
  eligible: boolean;
  awe?: number;
  smp?: number;
  notes?: string[];
};

export function calcSMP(): SmpResult {
  return { eligible: false, smp: 0, notes: ['stub'] };
}

export default calcSMP;
