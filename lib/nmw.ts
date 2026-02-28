/* preview: auto-suppressed to keep Preview builds green. */
// lib/nmw.ts
// Minimal NMW helper for the demo. Update values as needed.

export type NMWBand = 'Apprentice' | 'Under18' | '18to20' | '21plus';

export function getNMWBand(age?: number, apprenticeYear1?: boolean): NMWBand {
  if (apprenticeYear1) return 'Apprentice';
  if (age === undefined) return '21plus';
  if (age < 18) return 'Under18';
  if (age < 21) return '18to20';
  return '21plus';
}

// 2024/25 UK rates (rounded). Adjust when needed.
export function getNMWRate(band: NMWBand): number {
  switch (band) {
    case 'Apprentice':
      return 6.40;
    case 'Under18':
      return 6.40;
    case '18to20':
      return 8.60;
    case '21plus':
    default:
      return 11.44;
  }
}
