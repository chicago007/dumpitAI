const SEOUL_TZ = "Asia/Seoul";

export function getSeoulDateKeyFromIso(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", {
    timeZone: SEOUL_TZ,
  });
}

export function getSeoulDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month0: get("month") - 1,
    day: get("day"),
  };
}

export function seoulDateKey(year: number, month0: number, day: number) {
  const m = String(month0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** 서울 날짜 기준 Date (정오 앵커로 타임존 오차 방지) */
export function seoulCalendarDate(year: number, month0: number, day: number) {
  return new Date(`${seoulDateKey(year, month0, day)}T12:00:00+09:00`);
}

export function getSeoulMonthRange(year: number, month0: number) {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const start = new Date(seoulDateKey(year, month0, 1) + "T00:00:00+09:00");
  const end = new Date(
    seoulDateKey(year, month0, lastDay) + "T23:59:59+09:00",
  );
  return { start, end };
}

export function addSeoulMonths(year: number, month0: number, delta: number) {
  const d = seoulCalendarDate(year, month0, 1);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return getSeoulDateParts(d);
}

export function buildSeoulCalendarCells(year: number, month0: number) {
  const firstOfMonth = seoulCalendarDate(year, month0, 1);
  const dayOfWeek = firstOfMonth.getUTCDay();
  const mondayOffset = (dayOfWeek + 6) % 7;
  const startMs = firstOfMonth.getTime() - mondayOffset * 86400000;

  return Array.from({ length: 42 }, (_, i) => {
    const ms = startMs + i * 86400000;
    const key = getSeoulDateKeyFromIso(new Date(ms).toISOString());
    const parts = getSeoulDateParts(new Date(ms));
    return { key, parts, inMonth: parts.month0 === month0 };
  });
}
