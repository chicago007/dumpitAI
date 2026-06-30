"use client";

import { useState } from "react";
import type { Board } from "@/lib/types";
import { BoardInlineActions } from "@/components/boards/board-inline-actions";
import { BoardPeriodEditor } from "@/components/boards/board-period-editor";

interface BoardDetailHeaderProps {
  board: Board;
  progress: number;
  done: number;
  total: number;
}

export function BoardDetailHeader({
  board,
  progress,
  done,
  total,
}: BoardDetailHeaderProps) {
  const [displayName, setDisplayName] = useState(board.name);

  return (
    <header className="rounded-xl border border-border/60 bg-card p-3 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="group flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-lg font-bold text-foreground">{displayName}</h1>
            <BoardPeriodEditor
              boardId={board.id}
              startDate={board.start_date}
              endDate={board.end_date}
              inline
            />
            <BoardInlineActions
              boardId={board.id}
              initialName={board.name}
              initialStartDate={board.start_date}
              initialEndDate={board.end_date}
              redirectOnDelete="/boards"
              onNameUpdated={setDisplayName}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            체크리스트 {done}/{total} 완료
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {progress}%
          </span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: board.color }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
