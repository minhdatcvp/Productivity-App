export type Timeline = "DAILY" | "WEEKLY" | "MONTHLY";

function getISOWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getCurrentPeriod(timeline: Timeline): string {
  const d = new Date();
  if (timeline === "DAILY") return d.toISOString().split("T")[0];
  if (timeline === "WEEKLY") {
    const w = getISOWeek(d);
    return `${d.getFullYear()}-W${String(w).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftPeriod(timeline: Timeline, period: string, delta: number): string {
  if (timeline === "DAILY") {
    const d = new Date(period);
    d.setDate(d.getDate() + delta);
    return d.toISOString().split("T")[0];
  }
  if (timeline === "WEEKLY") {
    const [y, w] = period.split("-W").map(Number);
    const d = isoWeekToDate(y, w);
    d.setDate(d.getDate() + delta * 7);
    const nw = getISOWeek(d);
    return `${d.getFullYear()}-W${String(nw).padStart(2, "0")}`;
  }
  // MONTHLY
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoWeekToDate(year: number, week: number): Date {
  const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = d.getUTCDay();
  if (dow <= 4) d.setUTCDate(d.getUTCDate() - dow + 1);
  else d.setUTCDate(d.getUTCDate() + 8 - dow);
  return d;
}

function weekRange(year: number, week: number): { start: Date; end: Date } {
  const start = isoWeekToDate(year, week);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

const VI_DAYS = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
const VI_MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export function formatPeriod(timeline: Timeline, period: string): string {
  if (timeline === "DAILY") {
    const d = new Date(period + "T00:00:00");
    return `${VI_DAYS[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
  if (timeline === "WEEKLY") {
    const [y, w] = period.split("-W").map(Number);
    const { start, end } = weekRange(y, w);
    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `Tuần ${w} · ${fmt(start)} - ${fmt(end)}`;
  }
  const [y, m] = period.split("-").map(Number);
  return `${VI_MONTHS[m - 1]}, ${y}`;
}

export function isCurrentPeriod(timeline: Timeline, period: string): boolean {
  return period === getCurrentPeriod(timeline);
}
