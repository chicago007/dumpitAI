"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createEntry } from "@/actions/entries";
import { CalendarEntryRow } from "@/components/calendar/calendar-entry-row";
import { EntryList } from "@/components/entries/entry-list";
import { SectionCard } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category, Entry } from "@/lib/types";
import {
  addSeoulMonths,
  buildSeoulCalendarCells,
  seoulCalendarDate,
} from "@/lib/dates";
import { isKoreanHoliday } from "@/lib/korean-holidays";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface CalendarViewProps {
  year: number;
  month0: number;
  todayKey: string;
  isCurrentMonth: boolean;
  entriesByDay: Record<string, Entry[]>;
  categories: Category[];
  todos: Entry[];
}

function formatDayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  return date.toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function CalendarView({
  year,
  month0,
  todayKey,
  isCurrentMonth,
  entriesByDay,
  categories,
  todos,
}: CalendarViewProps) {
  const router = useRouter();
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [scheduleText, setScheduleText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cells = useMemo(
    () => buildSeoulCalendarCells(year, month0),
    [year, month0],
  );
  const prev = addSeoulMonths(year, month0, -1);
  const next = addSeoulMonths(year, month0, 1);

  const monthLabel = seoulCalendarDate(year, month0, 1).toLocaleDateString(
    "ko-KR",
    { timeZone: "Asia/Seoul", month: "long" },
  );

  const defaultCategoryId = categories[0]?.id ?? "";

  function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = scheduleText.trim();
    if (!trimmed || !selectedDayKey || !defaultCategoryId) return;

    setError(null);
    startTransition(async () => {
      try {
        await createEntry({
          content: trimmed,
          type: "schedule",
          categoryId: defaultCategoryId,
          dueAt: new Date(`${selectedDayKey}T09:00:00+09:00`).toISOString(),
        });
        setScheduleText("");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "일정 저장에 실패했습니다.",
        );
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">달력</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {monthLabel} {year} · 날짜를 눌러 일정 추가
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80"
            href={`/calendar?year=${prev.year}&month=${prev.month0 + 1}`}
          >
            이전
          </Link>
          {!isCurrentMonth && (
            <Link
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              href="/calendar"
            >
              오늘
            </Link>
          )}
          <Link
            className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80"
            href={`/calendar?year=${next.year}&month=${next.month0 + 1}`}
          >
            다음
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border text-center text-xs">
        {["월", "화", "수", "목", "금", "토", "일"].map((label, i) => (
          <div
            key={label}
            className={cn(
              "bg-card px-1 py-2 font-medium",
              i === 5 && "text-blue-600",
              i === 6 && "text-red-600",
              i < 5 && "text-muted-foreground",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="mt-px grid grid-cols-7 gap-px rounded-lg border border-border bg-border">
        {cells.map((cell, index) => {
          const colIndex = index % 7;
          const isSaturday = colIndex === 5;
          const isSunday = colIndex === 6;
          const dayEntries = (entriesByDay[cell.key] ?? []).sort((a, b) => {
            if (a.status !== b.status) {
              return a.status === "done" ? 1 : -1;
            }
            const aDate = a.due_at ?? a.completed_at ?? "";
            const bDate = b.due_at ?? b.completed_at ?? "";
            return aDate.localeCompare(bDate);
          });
          const cellDate = seoulCalendarDate(
            cell.parts.year,
            cell.parts.month0,
            cell.parts.day,
          );
          const isSelected = cell.key === selectedDayKey;
          const isToday = cell.key === todayKey;

          let dayColor = "text-foreground";
          if (!cell.inMonth) {
            dayColor = "text-muted-foreground/60";
          } else if (isKoreanHoliday(cellDate) || isSunday) {
            dayColor = "text-red-600";
          } else if (isSaturday) {
            dayColor = "text-blue-600";
          }

          return (
            <div
              key={cell.key}
              onClick={() => setSelectedDayKey(cell.key)}
              className={cn(
                "min-h-[88px] min-w-0 cursor-pointer bg-card p-1 text-left sm:min-h-[100px] sm:p-1.5",
                !cell.inMonth && "bg-muted/40",
                isSelected && "ring-2 ring-inset ring-primary",
                isToday && !isSelected && "ring-2 ring-inset ring-foreground/30",
                "hover:bg-muted/30 transition-colors",
              )}
            >
              <div className={cn("text-xs font-semibold sm:text-sm", dayColor)}>
                {cell.parts.day}
              </div>
              <div
                className="mt-1 space-y-1"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {dayEntries.map((entry) => (
                  <CalendarEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDayKey && (
        <form
          onSubmit={handleAddSchedule}
          className="mt-4 rounded-xl border border-border bg-card p-4"
        >
          <p className="mb-2 text-sm font-medium text-foreground">
            {formatDayLabel(selectedDayKey)} 일정 추가
          </p>
          <div className="flex gap-2">
            <Input
              id="calendar-schedule-input"
              name="schedule"
              autoComplete="off"
              value={scheduleText}
              onChange={(e) => {
                setScheduleText(e.target.value);
                setError(null);
              }}
              placeholder="일정 내용… Enter 저장"
              disabled={isPending || !defaultCategoryId}
              className="flex-1"
              aria-label={`${formatDayLabel(selectedDayKey)} 일정 내용`}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isPending || !scheduleText.trim() || !defaultCategoryId}
              aria-label="일정 추가"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      <SectionCard
        plain
        title={`할 일 (${todos.length})`}
        className="mt-6"
        contentClassName={todos.length === 0 ? "px-3 py-2" : undefined}
      >
        <EntryList
          entries={todos}
          categories={categories}
          variant="accent"
          emptyState={{
            message: "진행 중인 할 일이 없습니다",
            entryType: "todo",
            actionLabel: "할 일 추가",
            compact: true,
          }}
        />
      </SectionCard>
    </>
  );
}
