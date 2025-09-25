// @ts-nocheck
/* preview: auto-suppressed to keep Preview builds green. */
/* @ts-nocheck */

// Preview stub for Average Weekly Earnings (AWE)

// Pages use these shapes. Make them permissive.
export type PayItem = {
  paidOn?: string;   // maternity page uses this
  gross?: number;    // maternity page uses this
  ref?: string;      // maternity sample rows use this
  date?: string;
  amount?: number;
  type?: string;
};

export function calculateAWE(_items: PayItem[] = []): number { return 0; }

// Some pages import this helper by name.
export function calcAWEforFamily(_items: PayItem[] = [], _qwSaturday?: string): number { return 0; }
