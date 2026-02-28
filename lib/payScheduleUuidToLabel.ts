/* preview: auto-suppressed to keep Preview builds green. */
export type PayFrequency = 'weekly' | 'fortnightly' | 'fourweekly' | 'monthly';

export const PAY_SCHEDULE_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  fourweekly: 'Four-weekly',
  monthly: 'Monthly',
};

export function labelForFrequency(freq: string | null | undefined): string {
  switch ((freq ?? '').toLowerCase()) {
    case 'weekly':
      return PAY_SCHEDULE_LABELS.weekly;
    case 'fortnightly':
      return PAY_SCHEDULE_LABELS.fortnightly;
    case 'fourweekly':
    case 'four-weekly':
    case '4-weekly':
      return PAY_SCHEDULE_LABELS.fourweekly;
    case 'monthly':
      return PAY_SCHEDULE_LABELS.monthly;
    default:
      return '';
  }
}
