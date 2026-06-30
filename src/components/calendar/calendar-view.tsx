"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createEntry } from "@/actions/entries";
import {
  CalendarDayOverflow,
  CalendarEntryRow,
  CALENDAR_DAY_EVENT_LIMIT,
  sortCalendarDayEntries,
} from "@/components/calendar/calendar-entry-row";
import { EntryList } from "@/components/entries/entry-list";
import { SectionCard } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category, Entry } from "@/lib/types";
import {
  addSeoulMonths,
  buildSeoulCalendarCells,
  seoulCalendarDate,
} from "@/lib/dates";
import { isKoreanHoliday } from "@/lib/korean-holidays";
import { cn } from "@/lib/utils";
import { ChevronDown, Plus } from "lucide-react";

interface CalendarViewProps {
  year: number;
  month0: number;
  todayKey: string;
  isCurrentMonth: boolean;
  entriesByDay: Record<string, Entry[]>;
  categories: Category[];
  todos: Entry[];
  memos: Entry[];
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
  memos,
}: CalendarViewProps) {
  const router = useRouter();
  const dayDetailRef = useRef<HTMLElement>(null);
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [dayDetailExpanded, setDayDetailExpanded] = useState(true);
  const [scheduleText, setScheduleText] = useState("");
  const [todoText, setTodoText] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [memoText, setMemoText] = useState("");
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todoError, setTodoError] = useState<string | null>(null);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTodoPending, startTodoTransition] = useTransition();
  const [isMemoPending, startMemoTransition] = useTransition();
  const todoInputRef = useRef<HTMLInputElement>(null);
  const memoInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (showTodoForm) {
      setTodoDueDate((prev) => prev || selectedDayKey);
      todoInputRef.current?.focus();
    }
  }, [showTodoForm, selectedDayKey]);

  useEffect(() => {
    if (showMemoForm) {
      memoInputRef.current?.focus();
    }
  }, [showMemoForm]);

  function toggleTodoForm() {
    setShowTodoForm((prev) => {
      if (prev) {
        setTodoText("");
        setTodoDueDate("");
        setTodoError(null);
      } else {
        setTodoDueDate(selectedDayKey);
      }
      return !prev;
    });
  }

  function toggleMemoForm() {
    setShowMemoForm((prev) => {
      if (prev) {
        setMemoText("");
        setMemoError(null);
      }
      return !prev;
    });
  }

  function renderAddToggle(
    expanded: boolean,
    onToggle: () => void,
    label: string,
  ) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={expanded}
      >
        <Plus
          className={cn("h-4 w-4 transition-transform", expanded && "rotate-45")}
        />
      </Button>
    );
  }

  const selectedDayEntries = useMemo(() => {
    if (!selectedDayKey) return [];
    return sortCalendarDayEntries(entriesByDay[selectedDayKey] ?? []);
  }, [selectedDayKey, entriesByDay]);

  function selectDay(dayKey: string) {
    setSelectedDayKey(dayKey);
    setDayDetailExpanded(true);
    requestAnimationFrame(() => {
      dayDetailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  function expandDayDetail(dayKey: string) {
    setSelectedDayKey(dayKey);
    setDayDetailExpanded(true);
    requestAnimationFrame(() => {
      dayDetailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  function collapseDayDetail() {
    setDayDetailExpanded(false);
  }

  function toggleDayDetail() {
    setDayDetailExpanded((prev) => !prev);
  }

  function handleOverflowExpand(e: React.MouseEvent, dayKey: string) {
    e.stopPropagation();
    expandDayDetail(dayKey);
  }

  function handleOverflowCollapse(e: React.MouseEvent) {
    e.stopPropagation();
    collapseDayDetail();
  }

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

  function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = todoText.trim();
    if (!trimmed || !defaultCategoryId) return;

    setTodoError(null);
    startTodoTransition(async () => {
      try {
        await createEntry({
          content: trimmed,
          type: "todo",
          categoryId: defaultCategoryId,
          dueAt: todoDueDate
            ? new Date(`${todoDueDate}T09:00:00+09:00`).toISOString()
            : null,
        });
        setTodoText("");
        setTodoDueDate("");
        setShowTodoForm(false);
        router.refresh();
      } catch (err) {
        setTodoError(
          err instanceof Error ? err.message : "할 일 저장에 실패했습니다.",
        );
      }
    });
  }

  function handleAddMemo(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = memoText.trim();
    if (!trimmed || !defaultCategoryId) return;

    setMemoError(null);
    startMemoTransition(async () => {
      try {
        await createEntry({
          content: trimmed,
          type: "memo",
          categoryId: defaultCategoryId,
        });
        setMemoText("");
        setShowMemoForm(false);
        router.refresh();
      } catch (err) {
        setMemoError(
          err instanceof Error ? err.message : "메모 저장에 실패했습니다.",
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
            {monthLabel} {year} · 날짜 선택 후 일정·할 일·메모 추가
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
          const dayEntries = sortCalendarDayEntries(
            entriesByDay[cell.key] ?? [],
          );
          const visibleEntries = dayEntries.slice(0, CALENDAR_DAY_EVENT_LIMIT);
          const overflowCount = dayEntries.length - visibleEntries.length;
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
              onClick={() => selectDay(cell.key)}
              className={cn(
                "min-h-[76px] min-w-0 cursor-pointer bg-card p-0.5 text-left sm:min-h-[84px] sm:p-1",
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
                className="mt-0.5 space-y-px"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {visibleEntries.map((entry) => (
                  <CalendarEntryRow key={entry.id} entry={entry} />
                ))}
                <CalendarDayOverflow
                  count={overflowCount}
                  isExpanded={
                    isSelected && dayDetailExpanded && overflowCount > 0
                  }
                  onExpand={(e) => handleOverflowExpand(e, cell.key)}
                  onCollapse={handleOverflowCollapse}
                />
              </div>
            </div>
          );
        })}
      </div>

      {selectedDayKey && selectedDayEntries.length > 0 && (
        <section
          ref={dayDetailRef}
          className="mt-4 rounded-xl border border-border bg-card p-4"
        >
          <button
            type="button"
            onClick={toggleDayDetail}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={dayDetailExpanded}
          >
            <h2 className="text-sm font-medium text-foreground">
              {formatDayLabel(selectedDayKey)} · {selectedDayEntries.length}건
            </h2>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              {dayDetailExpanded ? "접기" : "펼치기"}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  dayDetailExpanded && "rotate-180",
                )}
              />
            </span>
          </button>

          {dayDetailExpanded ? (
            <div className="mt-3">
              <EntryList
                entries={selectedDayEntries}
                categories={categories}
                variant="cards"
              />
            </div>
          ) : null}
        </section>
      )}

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
        contentClassName="p-3"
        headerActions={renderAddToggle(showTodoForm, toggleTodoForm, "할 일 추가")}
      >
        {showTodoForm && (
          <form onSubmit={handleAddTodo} className="mb-3 space-y-2">
            <Input
              ref={todoInputRef}
              id="calendar-todo-input"
              name="todo"
              autoComplete="off"
              value={todoText}
              onChange={(e) => {
                setTodoText(e.target.value);
                setTodoError(null);
              }}
              placeholder="할 일 입력…"
              disabled={isTodoPending || !defaultCategoryId}
              className="w-full"
              aria-label="할 일 추가"
            />
            <div className="space-y-1.5">
              <Label htmlFor="calendar-todo-due" className="text-xs">
                마감일
              </Label>
              <Input
                id="calendar-todo-due"
                name="todoDue"
                type="date"
                value={todoDueDate}
                onChange={(e) => setTodoDueDate(e.target.value)}
                disabled={isTodoPending}
                className="w-auto"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleTodoForm}
              >
                취소
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isTodoPending || !todoText.trim() || !defaultCategoryId
                }
              >
                {isTodoPending ? "저장 중…" : "저장"}
              </Button>
            </div>
            {todoError && (
              <p className="text-sm text-destructive" role="alert">
                {todoError}
              </p>
            )}
          </form>
        )}
        <EntryList
          entries={todos}
          categories={categories}
          variant="accent"
          compactMeta={false}
          hideType
          emptyState={{
            message: "진행 중인 할 일이 없습니다",
            entryType: "todo",
            actionLabel: "할 일 추가",
            compact: true,
          }}
        />
      </SectionCard>

      <SectionCard
        plain
        title={`메모 (${memos.length})`}
        className="mt-4"
        contentClassName="p-3"
        headerActions={renderAddToggle(showMemoForm, toggleMemoForm, "메모 추가")}
      >
        {showMemoForm && (
          <form onSubmit={handleAddMemo} className="mb-3 space-y-2">
            <Input
              ref={memoInputRef}
              id="calendar-memo-input"
              name="memo"
              autoComplete="off"
              value={memoText}
              onChange={(e) => {
                setMemoText(e.target.value);
                setMemoError(null);
              }}
              placeholder="메모 입력…"
              disabled={isMemoPending || !defaultCategoryId}
              className="w-full"
              aria-label="메모 추가"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleMemoForm}
              >
                취소
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isMemoPending || !memoText.trim() || !defaultCategoryId
                }
              >
                {isMemoPending ? "저장 중…" : "저장"}
              </Button>
            </div>
            {memoError && (
              <p className="text-sm text-destructive" role="alert">
                {memoError}
              </p>
            )}
          </form>
        )}
        <EntryList
          entries={memos}
          categories={categories}
          variant="accent"
          showCheckbox={false}
          hideType
          emptyState={{
            message: "저장된 메모가 없습니다",
            entryType: "memo",
            actionLabel: "메모 추가",
            compact: true,
          }}
        />
      </SectionCard>
    </>
  );
}
