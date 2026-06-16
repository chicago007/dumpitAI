import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import { SetupNotice } from "@/components/setup/setup-notice";
import { CalendarEntryRow } from "@/components/calendar/calendar-entry-row";
import { getEntriesByDueRange } from "@/actions/entries";
import { loadCategories } from "@/lib/app-data";
import type { Entry } from "@/lib/types";
import { isSchemaSetupError } from "@/lib/supabase/errors";

function getSeoulDateKey(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });
}

function addMonths(year: number, month0: number, delta: number) {
  const d = new Date(year, month0, 1);
  d.setMonth(d.getMonth() + delta);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const now = new Date();
  const sp = searchParams ? await searchParams : undefined;
  const year = Number(sp?.year ?? now.getFullYear());
  const month0 = Number(sp?.month ?? now.getMonth() + 1) - 1;

  const categoriesResult = await loadCategories();
  if (!categoriesResult.ok) {
    return (
      <>
        <AppNav current="/calendar" />
        <SetupNotice />
      </>
    );
  }

  const monthStart = new Date(year, month0, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month0 + 1, 0, 23, 59, 59, 999);

  const types = ["todo", "checklist"] as const;

  let entries: Entry[] = [];
  try {
    entries = await getEntriesByDueRange({
      start: monthStart,
      end: monthEnd,
      types: [...types],
    });
  } catch (error) {
    if (isSchemaSetupError(error)) {
      return (
        <>
          <AppNav current="/calendar" />
          <SetupNotice />
        </>
      );
    }
    throw error;
  }

  const byDay = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (!entry.due_at) continue;
    const key = getSeoulDateKey(entry.due_at);
    const list = byDay.get(key) ?? [];
    list.push(entry);
    byDay.set(key, list);
  }

  const todayKey = getSeoulDateKey(now.toISOString());
  const firstCell = new Date(year, month0, 1);
  // Monday-first calendar
  const dayOfWeek = firstCell.getDay(); // 0..6 (Sun..Sat)
  const mondayOffset = (dayOfWeek + 6) % 7;
  firstCell.setDate(firstCell.getDate() - mondayOffset);

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(firstCell);
    d.setDate(firstCell.getDate() + i);
    return d;
  });

  const prev = addMonths(year, month0, -1);
  const next = addMonths(year, month0, 1);

  return (
    <>
      <AppNav current="/calendar" />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">달력</h1>
            <p className="mt-1 text-sm text-slate-500">
              {monthStart.toLocaleDateString("ko-KR", { month: "long" })}{" "}
              {year}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              href={`/calendar?year=${prev.year}&month=${prev.month0 + 1}`}
            >
              이전
            </Link>
            <Link
              className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              href={`/calendar?year=${next.year}&month=${next.month0 + 1}`}
            >
              다음
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-xs text-slate-500">
          {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
            <div key={d} className="px-1 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-2">
          {cells.map((date) => {
            const key = getSeoulDateKey(date.toISOString());
            const inMonth = date.getMonth() === month0;
            const dayEntries = (byDay.get(key) ?? []).sort(
              (a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""),
            );

            return (
              <div
                key={key}
                className={`min-h-[90px] rounded-lg border border-slate-200 bg-white p-2 ${
                  inMonth ? "" : "bg-slate-50"
                } ${key === todayKey ? "ring-2 ring-slate-900" : ""}`}
              >
                <div
                  className={`text-xs font-medium ${
                    inMonth ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {date.getDate()}
                </div>
                <div className="mt-2 space-y-1">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <CalendarEntryRow
                      key={entry.id}
                      entry={entry}
                    />
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-[11px] text-slate-500">
                      +{dayEntries.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

