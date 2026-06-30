"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBoardSchedule } from "@/actions/boards";
import { BoardEditableEntryRow } from "@/components/boards/board-editable-entry-row";
import { formatBoardDateRange } from "@/lib/board-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Entry } from "@/lib/types";
import {
  formatSeoulDayHeader,
  getSeoulDateKeyFromIso,
  seoulIsoFromDateAndTime,
} from "@/lib/dates";

interface BoardScheduleTabProps {
  boardId: string;
  boardName: string;
  projectPeriod?: string | null;
  entries: Entry[];
  defaultCategoryId: string;
}

export function BoardScheduleTab({
  boardId,
  boardName,
  projectPeriod,
  entries,
  defaultCategoryId,
}: BoardScheduleTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");

  const schedules = useMemo(
    () =>
      entries
        .filter((e) => e.type === "schedule")
        .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? "")),
    [entries],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of schedules) {
      const dayKey = e.due_at
        ? getSeoulDateKeyFromIso(e.due_at)
        : "unknown";
      const list = map.get(dayKey) ?? [];
      list.push(e);
      map.set(dayKey, list);
    }
    return map;
  }, [schedules]);

  const activeCount = schedules.filter((e) => e.status === "active").length;
  const doneCount = schedules.length - activeCount;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !date) return;
    const dueAt = seoulIsoFromDateAndTime(date, time);
    startTransition(async () => {
      await addBoardSchedule(boardId, trimmed, dueAt, defaultCategoryId);
      setContent("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
        <p className="text-sm font-medium text-foreground">
          {boardName} 일정 · {schedules.length}건
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          이 프로젝트 일정만 표시합니다. 전체 달력과는 별도로 관리됩니다.
          {projectPeriod ? ` · 프로젝트 기간 ${projectPeriod}` : ""}
          {doneCount > 0 ? ` · 완료 ${doneCount}` : ""}
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto h-8 text-sm"
        />
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-auto h-8 text-sm"
        />
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="일정 내용"
          className="h-8 text-sm flex-1 min-w-[120px]"
        />
        <Button type="submit" size="sm" className="h-8" disabled={isPending}>
          추가
        </Button>
      </form>

      {byDay.size === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          등록된 일정이 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          {Array.from(byDay.entries()).map(([day, dayEntries]) => (
            <section key={day}>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {day !== "unknown" ? formatSeoulDayHeader(day) : "날짜 없음"}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {dayEntries.length}건
                </span>
              </h3>
              <ul className="space-y-1 border-l-2 border-primary/30 pl-3">
                {dayEntries.map((entry) => (
                  <li key={entry.id}>
                    <BoardEditableEntryRow
                      entry={entry}
                      boardId={boardId}
                      variant="schedule"
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
