/** 한국 공휴일 (대체공휴일 포함) — 연도별 YYYY-MM-DD */

const HOLIDAYS: Record<number, string[]> = {
  2024: [
    "2024-01-01",
    "2024-02-09",
    "2024-02-10",
    "2024-02-11",
    "2024-02-12",
    "2024-03-01",
    "2024-04-10",
    "2024-05-05",
    "2024-05-06",
    "2024-05-15",
    "2024-06-06",
    "2024-08-15",
    "2024-09-16",
    "2024-09-17",
    "2024-09-18",
    "2024-10-03",
    "2024-10-09",
    "2024-12-25",
  ],
  2025: [
    "2025-01-01",
    "2025-01-28",
    "2025-01-29",
    "2025-01-30",
    "2025-03-01",
    "2025-03-03",
    "2025-05-05",
    "2025-05-06",
    "2025-06-06",
    "2025-08-15",
    "2025-10-03",
    "2025-10-05",
    "2025-10-06",
    "2025-10-07",
    "2025-10-08",
    "2025-10-09",
    "2025-12-25",
  ],
  2026: [
    "2026-01-01",
    "2026-02-16",
    "2026-02-17",
    "2026-02-18",
    "2026-03-01",
    "2026-05-05",
    "2026-05-24",
    "2026-06-06",
    "2026-08-15",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-10-03",
    "2026-10-05",
    "2026-10-09",
    "2026-12-25",
  ],
  2027: [
    "2027-01-01",
    "2027-02-06",
    "2027-02-07",
    "2027-02-08",
    "2027-03-01",
    "2027-05-05",
    "2027-05-13",
    "2027-06-06",
    "2027-08-15",
    "2027-09-14",
    "2027-09-15",
    "2027-09-16",
    "2027-10-03",
    "2027-10-04",
    "2027-10-09",
    "2027-12-25",
  ],
};

function toDateKey(year: number, month0: number, day: number) {
  const m = String(month0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function isKoreanHoliday(date: Date) {
  const year = date.getFullYear();
  const key = toDateKey(year, date.getMonth(), date.getDate());
  const list = HOLIDAYS[year];
  return list?.includes(key) ?? false;
}

export function getDayNumberColorClass(date: Date, inMonth: boolean) {
  if (!inMonth) return "text-slate-400";

  if (isKoreanHoliday(date) || date.getDay() === 0) {
    return "text-red-600";
  }
  if (date.getDay() === 6) {
    return "text-blue-600";
  }
  return "text-slate-900";
}

const WEEKDAY_LABELS = [
  { label: "월", color: "text-slate-500" },
  { label: "화", color: "text-slate-500" },
  { label: "수", color: "text-slate-500" },
  { label: "목", color: "text-slate-500" },
  { label: "금", color: "text-slate-500" },
  { label: "토", color: "text-blue-600" },
  { label: "일", color: "text-red-600" },
];

export { WEEKDAY_LABELS };
