"use client";

import { useState } from "react";
import type { Board, Category, Entry } from "@/lib/types";
import type { BoardMetadata, BoardTab } from "@/lib/board-types";
import { BOARD_TABS } from "@/lib/board-types";
import { BoardDetailHeader } from "@/components/boards/board-detail-header";
import { BoardCaptureInput } from "@/components/boards/board-capture-input";
import { BoardChecklistTab } from "@/components/boards/board-checklist-tab";
import { BoardScheduleTab } from "@/components/boards/board-schedule-tab";
import { BoardMemoTab } from "@/components/boards/board-memo-tab";
import { BoardBudgetTab } from "@/components/boards/board-budget-tab";
import { BoardExpenseTab } from "@/components/boards/board-expense-tab";
import { BoardAiTab } from "@/components/boards/board-ai-tab";
import { PROJECT_LABEL } from "@/lib/project-labels";
import { cn } from "@/lib/utils";

interface BoardDetailViewProps {
  board: Board;
  entries: Entry[];
  categories: Category[];
  progress: number;
  done: number;
  total: number;
  defaultCategoryId: string;
}

export function BoardDetailView({
  board,
  entries,
  categories,
  progress,
  done,
  total,
  defaultCategoryId,
}: BoardDetailViewProps) {
  const [tab, setTab] = useState<BoardTab>("checklist");
  const metadata = (board.metadata ?? {}) as BoardMetadata;

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:py-5 space-y-4">
      <BoardDetailHeader
        board={board}
        progress={progress}
        done={done}
        total={total}
      />

      <BoardCaptureInput
        boardId={board.id}
        defaultCategoryId={defaultCategoryId}
        defaultGroupId={metadata.checklistGroups?.[0]?.id}
        onSaved={(t) => setTab(t)}
      />

      <nav
        className="flex gap-1 overflow-x-auto pb-1 scrollbar-none"
        aria-label={`${PROJECT_LABEL} 탭`}
      >
        {BOARD_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-card min-h-[200px]">
        {tab === "checklist" && (
          <BoardChecklistTab
            boardId={board.id}
            entries={entries}
            metadata={metadata}
            defaultCategoryId={defaultCategoryId}
            boardColor={board.color}
          />
        )}
        {tab === "schedule" && (
          <BoardScheduleTab
            boardId={board.id}
            entries={entries}
            defaultCategoryId={defaultCategoryId}
          />
        )}
        {tab === "memo" && (
          <BoardMemoTab
            boardId={board.id}
            entries={entries}
            defaultCategoryId={defaultCategoryId}
          />
        )}
        {tab === "budget" && (
          <BoardBudgetTab
            boardId={board.id}
            budgetTotal={board.budget_total ?? 0}
            metadata={metadata}
          />
        )}
        {tab === "expense" && (
          <BoardExpenseTab boardId={board.id} metadata={metadata} />
        )}
        {tab === "ai" && <BoardAiTab board={board} />}
      </div>
    </div>
  );
}
