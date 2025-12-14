// C:\Users\adamm\Projects\wageflow01\lib\absence\validateOverlap.ts

/**
 * WageFlow – Absence overlap validator (v1)
 *
 * This is a pure helper.
 * It does not call Supabase.
 * It just checks for inclusive date overlaps between absences for a single employee.
 *
 * All dates are expected as ISO strings "YYYY-MM-DD".
 */

export type AbsenceRange = {
  id: string;
  startDate: string; // inclusive
  endDate: string;   // inclusive
};

export type OverlapConflict = {
  id: string;
  startDate: string;
  endDate: string;
};

export type OverlapValidationResult = {
  hasOverlap: boolean;
  conflicts: OverlapConflict[];
};

/**
 * Parse a "YYYY-MM-DD" string into a Date at midnight UTC.
 * Returns null if the value is falsy or invalid.
 */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Returns true if two ranges [aStart, aEnd] and [bStart, bEnd] overlap
 * using inclusive date logic.
 *
 * Overlap condition:
 *   aStart <= bEnd AND aEnd >= bStart
 */
function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

/**
 * Given a proposed absence range and a list of existing absences
 * for the same employee, finds any overlapping absences.
 *
 * - proposedStart and proposedEnd are required and must be "YYYY-MM-DD".
 * - existingAbsences should only contain active absences
 *   (cancelled ones should already be filtered out by the caller).
 * - currentId is the id of the record being edited.
 *   It will be excluded from the overlap check.
 */
export function validateAbsenceOverlap(
  proposedStart: string,
  proposedEnd: string,
  existingAbsences: AbsenceRange[],
  currentId?: string | null
): OverlapValidationResult {
  const startDate = parseDate(proposedStart);
  const endDate = parseDate(proposedEnd);

  if (!startDate || !endDate) {
    // If dates are invalid, we do not try to be clever here.
    // The caller should handle "required" and "date format" validation.
    return {
      hasOverlap: false,
      conflicts: [],
    };
  }

  // Normalise order in case caller passes them in reversed.
  const rangeStart = startDate <= endDate ? startDate : endDate;
  const rangeEnd = endDate >= startDate ? endDate : startDate;

  const conflicts: OverlapConflict[] = [];

  for (const absence of existingAbsences) {
    if (currentId && absence.id === currentId) {
      // Skip the record being edited.
      continue;
    }

    const existingStart = parseDate(absence.startDate);
    const existingEnd = parseDate(absence.endDate);

    if (!existingStart || !existingEnd) {
      // If existing data is broken, skip it rather than explode.
      continue;
    }

    const existingRangeStart =
      existingStart <= existingEnd ? existingStart : existingEnd;
    const existingRangeEnd =
      existingEnd >= existingStart ? existingEnd : existingStart;

    if (rangesOverlap(rangeStart, rangeEnd, existingRangeStart, existingRangeEnd)) {
      conflicts.push({
        id: absence.id,
        startDate: absence.startDate,
        endDate: absence.endDate,
      });
    }
  }

  return {
    hasOverlap: conflicts.length > 0,
    conflicts,
  };
}
