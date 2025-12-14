// C:\Users\adamm\Projects\wageflow01\lib\absence\mapAbsenceRanges.ts

/**
 * WageFlow – Map absence DB rows to AbsenceRange
 *
 * This helper knows how to turn raw absence rows
 * into AbsenceRange objects for overlap validation.
 *
 * Canonical range:
 *   - start: first_day
 *   - end: last_day_actual if set
 *          else last_day_expected if set
 *          else first_day
 */

import type { AbsenceRange } from "./validateOverlap"

export type DbAbsenceRow = {
  id: string
  first_day: string              // "YYYY-MM-DD"
  last_day_expected: string | null
  last_day_actual: string | null
}

/**
 * Decide which date is the effective end for overlap checks.
 *
 * Order:
 *   1) last_day_actual if not null
 *   2) last_day_expected if not null
 *   3) first_day as a fallback (single day absence)
 */
export function getEffectiveAbsenceEndDate(row: DbAbsenceRow): string {
  if (row.last_day_actual) return row.last_day_actual
  if (row.last_day_expected) return row.last_day_expected
  return row.first_day
}

/**
 * Map a list of DB rows into AbsenceRange objects.
 *
 * Caller is responsible for:
 *   - Filtering to the correct employee/company
 *   - Excluding cancelled/soft deleted rows
 *   - Excluding the current absence if needed
 */
export function mapAbsenceRowsToRanges(rows: DbAbsenceRow[]): AbsenceRange[] {
  return rows.map((row) => ({
    id: row.id,
    startDate: row.first_day,
    endDate: getEffectiveAbsenceEndDate(row),
  }))
}
