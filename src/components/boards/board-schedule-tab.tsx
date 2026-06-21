"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addBoardSchedule } from "@/actions/boards";
import { BoardEditableEntryRow } from "@/components/boards/board-editable-entry-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Entry } from "@/lib/types";

function formatDayHeader(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

interface BoardScheduleTabProps {
  boardId: string;
  entries: Entry[];
  defaultCategoryId: string;
}

export function BoardScheduleTab({
  boardId,
  entries,
  defaultCategoryId,
}: BoardScheduleTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");

  const schedules = entries
    .filter((e) => e.type === "schedule")
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));

  const byDay = new Map<string, Entry[]>();
  for (const e of schedules) {
    const dayKey = e.due_at?.slice(0, 10) ?? "unknown";
    const list = byDay.get(dayKey) ?? [];
    list.push(e);
    byDay.set(dayKey, list);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !date) return;
    const dueAt = new Date(`${date}T${time}:00`).toISOString();
    startTransition(async () => {
      await addBoardSchedule(boardId, trimmed, dueAt, defaultCategoryId);
      setContent("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
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
                {day !== "unknown" ? formatDayHeader(day) : "날짜 없음"}
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

      <Link
        href="/calendar"
        className="text-xs font-medium text-primary hover:underline"
      >
        캘린더에서 전체 일정 보기 →
      </Link>
    </div>
  );
}
