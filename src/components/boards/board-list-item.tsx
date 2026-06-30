"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BoardWithProgress } from "@/actions/boards";
import { formatBoardDateRange } from "@/lib/board-templates";
import { BoardInlineActions } from "@/components/boards/board-inline-actions";
import { BoardQuickEditForm } from "@/components/boards/board-quick-edit-form";

interface BoardListItemProps {
  board: BoardWithProgress;
}

export function BoardListItem({ board }: BoardListItemProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(board.name);
  const dateRange = formatBoardDateRange(board.start_date, board.end_date);

  if (isEditing) {
    return (
      <li className="rounded-lg border border-border/50 bg-muted/30">
        <BoardQuickEditForm
          boardId={board.id}
          initialName={board.name}
          initialStartDate={board.start_date}
          initialEndDate={board.end_date}
          color={board.color}
          onSaved={(name) => {
            setDisplayName(name);
            setIsEditing(false);
            router.refresh();
          }}
          onCancel={() => setIsEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/20 pr-1 transition-colors hover:bg-muted/40">
      <Link
        href={`/boards/${board.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2"
      >
        <span
          className="shrink-0 text-sm font-bold leading-none"
          style={{ color: board.color }}
          aria-hidden
        >
          ■
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {displayName}
          </p>
          {dateRange && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {dateRange}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs tabular-nums text-muted-foreground">
            {board.progress}%
          </span>
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${board.progress}%`,
                backgroundColor: board.color,
              }}
            />
          </div>
        </div>
      </Link>
      <BoardInlineActions
        boardId={board.id}
        initialName={board.name}
        onStartEdit={() => setIsEditing(true)}
      />
    </li>
  );
}
