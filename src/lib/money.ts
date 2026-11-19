/** Money is always a whole number of UZS (bigint in Postgres, integer number in JS). */
const nf = new Intl.NumberFormat("ru-RU");

export function formatUZS(amount: number, unit = "soʻm"): string {
  return `${nf.format(Math.trunc(amount)).replace(/\u00a0|\u202f/g, " ")} ${unit}`;
}

export function parseUZS(input: string): number | null {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function normalizePhone(input: string): string | null {
  const d = input.replace(/\D/g, "");
  const full = d.length === 9 ? "998" + d : d;
  return /^998\d{9}$/.test(full) ? "+" + full : null;
}
