"use client";

import { useTransition } from "react";
import { toggleEntryDone } from "@/actions/entries";
import { getEntryTypeTheme } from "@/lib/entry-type-theme";
import type { Entry } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ORDER: Record<string, number> = {
  schedule: 0,
  todo: 1,
  checklist: 2,
  memo: 3,
};

export function sortCalendarDayEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "done" ? 1 : -1;
    }
    const orderDiff =
      (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    const aDate = a.due_at ?? a.created_at ?? a.completed_at ?? "";
    const bDate = b.due_at ?? b.created_at ?? b.completed_at ?? "";
    return aDate.localeCompare(bDate);
  });
}

export function CalendarEntryRow({
  entry,
  variant = "compact",
}: {
  entry: Entry;
  variant?: "compact" | "full";
}) {
  const isDone = entry.status === "done";
  const theme = getEntryTypeTheme(entry.type);
  const [isPending, startTransition] = useTransition();
  const canToggle = entry.type === "todo" || entry.type === "checklist";

  function handleToggle() {
    if (!canToggle || isPending) return;
    startTransition(async () => {
      await toggleEntryDone(entry.id, !isDone);
    });
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    handleToggle();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      handleToggle();
    }
  }

  return (
    <div
      role={canToggle ? "button" : undefined}
      tabIndex={canToggle ? 0 : undefined}
      onClick={canToggle ? handleClick : undefined}
      onKeyDown={canToggle ? handleKeyDown : undefined}
      className={cn(
        "flex min-w-0 items-center gap-1 rounded-sm px-0.5",
        variant === "compact" ? "py-px" : "py-1",
        canToggle && "cursor-pointer hover:bg-muted/50",
        isDone && "opacity-55",
        isPending && "opacity-40",
      )}
      title={entry.content}
    >
      <span
        className={cn(
          "h-1.5 w-1 shrink-0 rounded-full",
          isDone && "bg-muted-foreground",
        )}
        style={isDone ? undefined : { backgroundColor: theme.color }}
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 flex-1 text-foreground",
          variant === "compact"
            ? "truncate text-[9px] leading-none sm:text-[10px]"
            : "text-sm leading-snug",
          isDone && "text-muted-foreground line-through",
        )}
      >
        {entry.content}
      </span>
    </div>
  );
}

/** 달력 칸에 표시할 최대 이벤트 수 */
export const CALENDAR_DAY_EVENT_LIMIT = 3;

export function CalendarDayOverflow({
  count,
  isExpanded,
  onExpand,
  onCollapse,
}: {
  count: number;
  isExpanded?: boolean;
  onExpand?: (e: React.MouseEvent) => void;
  onCollapse?: (e: React.MouseEvent) => void;
}) {
  if (isExpanded) {
    return (
      <button
        type="button"
        onClick={onCollapse}
        className="w-full truncate px-0.5 text-left text-[9px] leading-none text-primary hover:underline sm:text-[10px]"
      >
        접기
      </button>
    );
  }

  if (count <= 0) return null;

  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full truncate px-0.5 text-left text-[9px] leading-none text-primary hover:underline sm:text-[10px]"
    >
      +{count} 더
    </button>
  );
}
