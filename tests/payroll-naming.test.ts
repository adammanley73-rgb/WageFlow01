import { describe, expect, it } from "vitest";
import {
  labelForRun,
  taxMonthNumber,
  taxWeekNumber,
  ukTaxYearStartFor,
} from "../lib/payroll/naming";

function localIso(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

describe("payroll run naming by UK tax year", () => {
  it("starts the UK tax year on 6 April", () => {
    expect(localIso(ukTaxYearStartFor("2026-04-05"))).toBe("2025-04-06");
    expect(localIso(ukTaxYearStartFor("2026-04-06"))).toBe("2026-04-06");
  });

  it("labels monthly runs by tax month, not calendar month", () => {
    expect(labelForRun({ frequency: "monthly", periodStart: "2026-04-06" })).toBe("Mth 1");
    expect(labelForRun({ frequency: "monthly", periodStart: "2026-05-05" })).toBe("Mth 1");
    expect(labelForRun({ frequency: "monthly", periodStart: "2026-05-06" })).toBe("Mth 2");
    expect(labelForRun({ frequency: "monthly", periodStart: "2027-03-06" })).toBe("Mth 12");
    expect(labelForRun({ frequency: "monthly", periodStart: "2027-04-05" })).toBe("Mth 12");
  });

  it("calculates monthly tax month boundaries from the 6th to the 5th", () => {
    const taxStart = "2026-04-06";

    expect(taxMonthNumber("2026-04-06", taxStart)).toBe(1);
    expect(taxMonthNumber("2026-05-05", taxStart)).toBe(1);
    expect(taxMonthNumber("2026-05-06", taxStart)).toBe(2);
    expect(taxMonthNumber("2027-04-05", taxStart)).toBe(12);
  });

  it("labels weekly runs from tax-year week 1", () => {
    expect(labelForRun({ frequency: "weekly", periodStart: "2026-04-06" })).toBe("wk 1");
    expect(labelForRun({ frequency: "weekly", periodStart: "2026-04-12" })).toBe("wk 1");
    expect(labelForRun({ frequency: "weekly", periodStart: "2026-04-13" })).toBe("wk 2");
  });

  it("calculates tax week numbers in 7 day blocks from 6 April", () => {
    const taxStart = "2026-04-06";

    expect(taxWeekNumber("2026-04-06", taxStart)).toBe(1);
    expect(taxWeekNumber("2026-04-12", taxStart)).toBe(1);
    expect(taxWeekNumber("2026-04-13", taxStart)).toBe(2);
  });

  it("labels fortnightly runs as two-week ranges", () => {
    expect(labelForRun({ frequency: "fortnightly", periodStart: "2026-04-06" })).toBe("wk 1-2");
    expect(labelForRun({ frequency: "fortnightly", periodStart: "2026-04-20" })).toBe("wk 3-4");
  });

  it("labels four-weekly runs as four-week ranges", () => {
    expect(labelForRun({ frequency: "fourweekly", periodStart: "2026-04-06" })).toBe("wk 1-4");
    expect(labelForRun({ frequency: "four_weekly", periodStart: "2026-04-06" })).toBe("wk 1-4");
    expect(labelForRun({ frequency: "fourweekly", periodStart: "2026-05-04" })).toBe("wk 5-8");
  });

  it("clamps final weekly ranges to week 52", () => {
    expect(labelForRun({ frequency: "weekly", periodStart: "2027-04-05" })).toBe("wk 52");
    expect(labelForRun({ frequency: "fortnightly", periodStart: "2027-04-05" })).toBe("wk 52");
    expect(labelForRun({ frequency: "fourweekly", periodStart: "2027-04-05" })).toBe("wk 52");
  });
});
