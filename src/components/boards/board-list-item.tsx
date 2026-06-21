"use client";

import Link from "next/link";
import type { BoardWithProgress } from "@/actions/boards";
import { BoardInlineActions } from "@/components/boards/board-inline-actions";

interface BoardListItemProps {
  board: BoardWithProgress;
}

export function BoardListItem({ board }: BoardListItemProps) {
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
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {board.name}
        </p>
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
      <BoardInlineActions boardId={board.id} initialName={board.name} />
    </li>
  );
}
