// lib/pay-schedule.ts
// Helpers for constructing and previewing pay schedules.

// Sunday=0
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PayFrequency = 'Weekly' | 'BiWeekly' | 'FourWeekly' | 'Monthly';

export type MonthlyRule =
  | { mode: 'SpecificDate'; dayOfMonth: number; previousWorkingDay?: boolean }
  | { mode: 'LastWorkingDay' }
  | { mode: 'LastWeekday'; weekday: Weekday };

function clone(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const c = clone(d);
  c.setDate(c.getDate() + n);
  return c;
}

function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// Mon–Fri only. No public holiday calendar in the demo.
function isWorkingDay(d: Date) {
  return !isWeekend(d);
}

function fmt(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function nextWeekday(from: Date, weekday: Weekday) {
  const d = clone(from);
  const diff = (weekday - d.getDay() + 7) % 7 || 7; // strictly in the future
  return addDays(d, diff);
}

function lastWorkingDayOfMonth(year: number, month: number) {
  // month 0..11
  const d = new Date(year, month + 1, 0);
  while (!isWorkingDay(d)) d.setDate(d.getDate() - 1);
  return d;
}

function lastWeekdayOfMonth(year: number, month: number, weekday: Weekday) {
  const d = new Date(year, month + 1, 0);
  const diff = (d.getDay() - weekday + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function specificDateWithFallback(
  year: number,
  month: number,
  dom: number,
  previousWorkingDay: boolean
) {
  const last = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dom, last);
  const d = new Date(year, month, day);
  if (!previousWorkingDay) return d;
  while (!isWorkingDay(d)) d.setDate(d.getDate() - 1);
  return d;
}

export function previewNextPayDates(
  frequency: PayFrequency,
  cfg: {
    weekday?: Weekday;
    anchorDateISO?: string;
    monthlyRule?: MonthlyRule;
  },
  count = 3,
  fromDate = new Date()
): string[] {
  const out: string[] = [];
  const start = clone(fromDate);

  if (frequency === 'Weekly') {
    const weekday = cfg.weekday ?? 5; // Friday
    let d = nextWeekday(start, weekday);
    for (let i = 0; i < count; i++) {
      out.push(fmt(d));
      d = addDays(d, 7);
    }
    return out;
  }

  if (frequency === 'BiWeekly' || frequency === 'FourWeekly') {
    const anchorISO = cfg.anchorDateISO;
    if (!anchorISO) return out;
    const interval = frequency === 'BiWeekly' ? 14 : 28;
    let anchor = new Date(anchorISO);
    if (Number.isNaN(anchor.getTime())) return out;

    if (anchor <= start) {
      const diffDays = Math.ceil((start.getTime() - anchor.getTime()) / 86400000);
      const steps = Math.ceil(diffDays / interval);
      anchor = addDays(anchor, steps * interval);
    }

    for (let i = 0; i < count; i++) {
      out.push(fmt(anchor));
      anchor = addDays(anchor, interval);
    }
    return out;
  }

  if (frequency === 'Monthly') {
    const rule =
      cfg.monthlyRule ?? ({ mode: 'SpecificDate', dayOfMonth: 25, previousWorkingDay: true } as MonthlyRule);

    let y = start.getFullYear();
    let m = start.getMonth();

    const thisMonthPay = (() => {
      if (rule.mode === 'SpecificDate') {
        const d = specificDateWithFallback(y, m, rule.dayOfMonth, !!rule.previousWorkingDay);
        return d > start ? d : null;
      }
      if (rule.mode === 'LastWorkingDay') {
        const d = lastWorkingDayOfMonth(y, m);
        return d > start ? d : null;
      }
      if (rule.mode === 'LastWeekday') {
        const d = lastWeekdayOfMonth(y, m, rule.weekday);
        return d > start ? d : null;
      }
      return null;
    })();

    if (thisMonthPay) out.push(fmt(thisMonthPay));

    while (out.length < count) {
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      let d: Date;
      if (rule.mode === 'SpecificDate') {
        d = specificDateWithFallback(y, m, rule.dayOfMonth, !!rule.previousWorkingDay);
      } else if (rule.mode === 'LastWorkingDay') {
        d = lastWorkingDayOfMonth(y, m);
      } else {
        d = lastWeekdayOfMonth(y, m, rule.weekday);
      }
      out.push(fmt(d));
    }
    return out;
  }

  return out;
}
