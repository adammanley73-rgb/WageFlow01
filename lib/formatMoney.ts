export type MoneyLike = number | string | null | undefined;

export function toMoneyNumber(value: MoneyLike): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

export function roundMoney(value: MoneyLike): number {
  return Number(toMoneyNumber(value).toFixed(2));
}

export function formatMoney(value: MoneyLike): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toMoneyNumber(value));
}

export function formatMoneyPlain(value: MoneyLike): string {
  return toMoneyNumber(value).toFixed(2);
}

export function formatMoneyInput(value: MoneyLike): string {
  return formatMoneyPlain(value);
}