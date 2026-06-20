import Link from "next/link";
import { SetupNotice } from "@/components/setup/setup-notice";
import { CalendarEntryRow } from "@/components/calendar/calendar-entry-row";
import { getEntriesByDueRange } from "@/actions/entries";
import { loadCategories } from "@/lib/app-data";
import {
  addSeoulMonths,
  buildSeoulCalendarCells,
  getSeoulDateKeyFromIso,
  getSeoulDateParts,
  getSeoulMonthRange,
  seoulCalendarDate,
} from "@/lib/dates";
import { isKoreanHoliday } from "@/lib/korean-holidays";
import type { Entry } from "@/lib/types";
import { isSchemaSetupError } from "@/lib/supabase/errors";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const now = new Date();
  const todayParts = getSeoulDateParts(now);
  const todayKey = getSeoulDateKeyFromIso(now.toISOString());

  const sp = searchParams ? await searchParams : undefined;
  const year = Number(sp?.year ?? todayParts.year);
  const month0 = Number(sp?.month ?? todayParts.month0 + 1) - 1;

  const isCurrentMonth =
    year === todayParts.year && month0 === todayParts.month0;

  const categoriesResult = await loadCategories();
  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const { start: monthStart, end: monthEnd } = getSeoulMonthRange(year, month0);
  const types = ["todo", "checklist", "schedule"] as const;

  let entries: Entry[] = [];
  try {
    entries = await getEntriesByDueRange({
      start: monthStart,
      end: monthEnd,
      types: [...types],
    });
  } catch (error) {
    if (isSchemaSetupError(error)) {
      return <SetupNotice />;
    }
    throw error;
  }

  const byDay = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (!entry.due_at) continue;
    const key = getSeoulDateKeyFromIso(entry.due_at);
    const list = byDay.get(key) ?? [];
    list.push(entry);
    byDay.set(key, list);
  }

  const cells = buildSeoulCalendarCells(year, month0);
  const prev = addSeoulMonths(year, month0, -1);
  const next = addSeoulMonths(year, month0, 1);

  const monthLabel = seoulCalendarDate(year, month0, 1).toLocaleDateString(
    "ko-KR",
    { timeZone: "Asia/Seoul", month: "long" },
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">달력</h1>
            <p className="mt-1 text-sm text-slate-500">
              {monthLabel} {year}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              href={`/calendar?year=${prev.year}&month=${prev.month0 + 1}`}
            >
              이전
            </Link>
            {!isCurrentMonth && (
              <Link
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                href="/calendar"
              >
                오늘
              </Link>
            )}
            <Link
              className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              href={`/calendar?year=${next.year}&month=${next.month0 + 1}`}
            >
              다음
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200 text-center text-xs">
          <div className="bg-white px-1 py-2 font-medium text-slate-500">월</div>
          <div className="bg-white px-1 py-2 font-medium text-slate-500">화</div>
          <div className="bg-white px-1 py-2 font-medium text-slate-500">수</div>
          <div className="bg-white px-1 py-2 font-medium text-slate-500">목</div>
          <div className="bg-white px-1 py-2 font-medium text-slate-500">금</div>
          <div className="bg-white px-1 py-2 font-medium text-blue-600">토</div>
          <div className="bg-white px-1 py-2 font-medium text-red-600">일</div>
        </div>

        <div className="mt-px grid grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200">
          {cells.map((cell, index) => {
            const colIndex = index % 7;
            const isSaturday = colIndex === 5;
            const isSunday = colIndex === 6;
            const dayEntries = (byDay.get(cell.key) ?? []).sort(
              (a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""),
            );
            const cellDate = seoulCalendarDate(
              cell.parts.year,
              cell.parts.month0,
              cell.parts.day,
            );

            let dayColor = "text-slate-900";
            if (!cell.inMonth) {
              dayColor = "text-slate-400";
            } else if (isKoreanHoliday(cellDate) || isSunday) {
              dayColor = "text-red-600";
            } else if (isSaturday) {
              dayColor = "text-blue-600";
            }

            return (
              <div
                key={cell.key}
                className={`min-h-[88px] min-w-0 bg-white p-1 sm:min-h-[100px] sm:p-1.5 ${
                  cell.inMonth ? "" : "bg-slate-50"
                } ${cell.key === todayKey ? "ring-2 ring-inset ring-slate-900" : ""}`}
              >
                <div className={`text-xs font-semibold sm:text-sm ${dayColor}`}>
                  {cell.parts.day}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEntries.map((entry) => (
                    <CalendarEntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
    </main>
  );
}
