import { SetupNotice } from "@/components/setup/setup-notice";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getActiveSpace } from "@/actions/space";
import { getEntriesByDueRange } from "@/actions/entries";
import { loadCategories, loadEntries } from "@/lib/app-data";
import {
  getSeoulDateKeyFromIso,
  getSeoulDateParts,
  getSeoulMonthRange,
} from "@/lib/dates";
import type { Entry } from "@/lib/types";
import { isSchemaSetupError } from "@/lib/supabase/errors";

function getCalendarDayKey(entry: Entry): string | null {
  if (entry.due_at) {
    return getSeoulDateKeyFromIso(entry.due_at);
  }
  if (entry.type === "memo") {
    return getSeoulDateKeyFromIso(entry.created_at);
  }
  if (entry.status === "done" && entry.completed_at) {
    return getSeoulDateKeyFromIso(entry.completed_at);
  }
  return null;
}

function isInMonthRange(iso: string, startKey: string, endKey: string) {
  const key = getSeoulDateKeyFromIso(iso);
  return key >= startKey && key <= endKey;
}

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

  const activeSpace = await getActiveSpace();
  const categoriesResult = await loadCategories(activeSpace);
  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const { start: monthStart, end: monthEnd } = getSeoulMonthRange(year, month0);
  const monthStartKey = getSeoulDateKeyFromIso(monthStart.toISOString());
  const monthEndKey = getSeoulDateKeyFromIso(monthEnd.toISOString());
  const types = ["todo", "checklist", "schedule", "memo"] as const;

  let entries: Entry[] = [];
  try {
    entries = await getEntriesByDueRange({
      start: monthStart,
      end: monthEnd,
      types: [...types],
      space: activeSpace,
      includeDone: true,
    });
  } catch (error) {
    if (isSchemaSetupError(error)) {
      return <SetupNotice />;
    }
    throw error;
  }

  const memoCalendarResult = await loadEntries({
    type: "memo",
    status: "active",
    space: activeSpace,
  });
  const seenIds = new Set(entries.map((e) => e.id));
  if (memoCalendarResult.ok) {
    for (const memo of memoCalendarResult.data) {
      if (memo.due_at) continue;
      if (!isInMonthRange(memo.created_at, monthStartKey, monthEndKey)) {
        continue;
      }
      if (!seenIds.has(memo.id)) {
        entries.push(memo);
        seenIds.add(memo.id);
      }
    }
  }

  const entriesByDay: Record<string, Entry[]> = {};
  for (const entry of entries) {
    const key = getCalendarDayKey(entry);
    if (!key) continue;
    const list = entriesByDay[key] ?? [];
    list.push(entry);
    entriesByDay[key] = list;
  }

  const todoResult = await loadEntries({
    type: "todo",
    status: "active",
    space: activeSpace,
  });
  const todos = todoResult.ok
    ? [...todoResult.data].sort((a, b) => {
        if (!a.due_at && !b.due_at) return 0;
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return a.due_at.localeCompare(b.due_at);
      })
    : [];

  const memos = memoCalendarResult.ok
    ? [...memoCalendarResult.data]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 20)
    : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <CalendarView
        year={year}
        month0={month0}
        todayKey={todayKey}
        isCurrentMonth={isCurrentMonth}
        entriesByDay={entriesByDay}
        categories={categoriesResult.data}
        todos={todos}
        memos={memos}
      />
    </main>
  );
}
