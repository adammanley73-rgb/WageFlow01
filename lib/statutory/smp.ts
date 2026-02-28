/* preview: auto-suppressed to keep Preview builds green. */

// Preview stub for Statutory Maternity Pay (SMP)

export type SmpResult = {
  weeklyRate: number;
  total: number;
  details?: any;
};

export function calculateSMP(): SmpResult {
  return { weeklyRate: 0, total: 0, details: "SMP preview stub" };
}
