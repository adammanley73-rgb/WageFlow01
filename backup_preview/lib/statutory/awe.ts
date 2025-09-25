/* @ts-nocheck */

// Compile-safe preview stub for Average Weekly Earnings

// Pages expect these shapes in different places.
// Include the fields they actually use.
export type PayItem = {
  paidOn?: string;   // used in maternity page
  gross?: number;    // used in maternity page
  date?: string;     // alternate naming in other modules
  amount?: number;   // alternate naming in other modules
  type?: string;
};

// Basic AWE calculation placeholder
export function calculateAWE(_items: PayItem[] = []): number {
  return 0;
}

// Some pages import this utility by name.
export function calcAWEforFamily(_items: PayItem[] = [], _qwSaturday?: string): number {
  return 0;
}
