export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface MonthRange {
  key: string;
  from: string;
  to: string;
}

export function monthRangeOf(key: string): MonthRange {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    key,
    from: `${key}-01`,
    to: `${key}-${String(last).padStart(2, "0")}`,
  };
}
