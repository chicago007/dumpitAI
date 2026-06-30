"use client";

import { useMemo, useState } from "react";
import type { Board, Category, Entry } from "@/lib/types";
import type { BoardMetadata, BoardTab } from "@/lib/board-types";
import { BoardDetailHeader } from "@/components/boards/board-detail-header";
import { BoardCaptureInput } from "@/components/boards/board-capture-input";
import { BoardChecklistTab } from "@/components/boards/board-checklist-tab";
import { BoardScheduleTab } from "@/components/boards/board-schedule-tab";
import { BoardMemoTab } from "@/components/boards/board-memo-tab";
import { BoardBudgetTab } from "@/components/boards/board-budget-tab";
import { BoardExpenseTab } from "@/components/boards/board-expense-tab";
import { BoardAiTab } from "@/components/boards/board-ai-tab";
import { BoardTabNav } from "@/components/boards/board-tab-nav";
import { resolveBoardTabs } from "@/lib/board-tabs";
import { formatBoardDateRange } from "@/lib/board-templates";

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
  const metadata = (board.metadata ?? {}) as BoardMetadata;
  const tabs = useMemo(() => resolveBoardTabs(metadata), [metadata]);
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "checklist");

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const activeKind: BoardTab = activeTab?.kind ?? "checklist";

  const dedicatedGroupIds = useMemo(
    () =>
      tabs
        .map((t) => t.checklistGroupId)
        .filter((id): id is string => Boolean(id)),
    [tabs],
  );

  function handleSaved(kind: BoardTab) {
    const target = tabs.find((t) => t.kind === kind);
    if (target) setActiveTabId(target.id);
  }

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
        onSaved={handleSaved}
      />

      <BoardTabNav
        boardId={board.id}
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
      />

      <div className="rounded-xl border border-border/60 bg-card p-3 shadow-card min-h-[200px]">
        {activeKind === "checklist" && (
          <BoardChecklistTab
            boardId={board.id}
            entries={entries}
            metadata={metadata}
            defaultCategoryId={defaultCategoryId}
            boardColor={board.color}
            filterGroupId={activeTab?.checklistGroupId}
            dedicatedGroupIds={dedicatedGroupIds}
          />
        )}
        {activeKind === "schedule" && (
          <BoardScheduleTab
            boardId={board.id}
            boardName={board.name}
            projectPeriod={formatBoardDateRange(
              board.start_date,
              board.end_date,
            )}
            entries={entries}
            defaultCategoryId={defaultCategoryId}
          />
        )}
        {activeKind === "memo" && (
          <BoardMemoTab
            boardId={board.id}
            entries={entries}
            defaultCategoryId={defaultCategoryId}
          />
        )}
        {activeKind === "budget" && (
          <BoardBudgetTab
            boardId={board.id}
            budgetTotal={board.budget_total ?? 0}
            metadata={metadata}
          />
        )}
        {activeKind === "expense" && (
          <BoardExpenseTab boardId={board.id} metadata={metadata} />
        )}
        {activeKind === "ai" && <BoardAiTab board={board} />}
      </div>
    </div>
  );
}
