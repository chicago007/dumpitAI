"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  addChecklistGroup,
  addChecklistItem,
  addAiSuggestionsToChecklist,
  submitBoardClassifiedInput,
} from "@/actions/boards";
import { classifyBoardInput, parseChecklistCategoryItem } from "@/lib/board-classify";
import {
  getChecklistItemOrder,
  sortEntriesByChecklistOrder,
} from "@/lib/board-checklist-order";
import { parseBoardMoney } from "@/lib/board-money";
import { BoardChecklistItemList } from "@/components/boards/board-checklist-item-list";
import { BoardChecklistExcelUpload } from "@/components/boards/board-checklist-excel-upload";
import { BoardChecklistGroupHeader } from "@/components/boards/board-checklist-group-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { BoardMetadata } from "@/lib/board-types";
import type { Entry } from "@/lib/types";

function getGroupId(entry: Entry): string | null {
  const id = entry.metadata?.checklistGroupId;
  return typeof id === "string" ? id : null;
}

function groupProgress(entries: Entry[]) {
  if (entries.length === 0) return 0;
  const done = entries.filter((e) => e.status === "done").length;
  return Math.round((done / entries.length) * 100);
}

interface BoardChecklistTabProps {
  boardId: string;
  entries: Entry[];
  metadata: BoardMetadata;
  defaultCategoryId: string;
  boardColor: string;
}

export function BoardChecklistTab({
  boardId,
  entries,
  metadata,
  defaultCategoryId,
  boardColor,
}: BoardChecklistTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [newItemDate, setNewItemDate] = useState<Record<string, string>>({});
  const [newItemAmount, setNewItemAmount] = useState<Record<string, string>>({});
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroupId, setAddingGroupId] = useState<string | null>(null);
  const [selectedAi, setSelectedAi] = useState<Set<string>>(new Set());

  const checklistEntries = entries.filter(
    (e) => e.type === "todo" || e.type === "checklist",
  );
  const total = checklistEntries.length;
  const done = checklistEntries.filter((e) => e.status === "done").length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  const groups = metadata.checklistGroups ?? [];
  const itemOrder = getChecklistItemOrder(metadata);
  const aiSuggestions = metadata.aiSuggestions ?? [];

  function refresh() {
    router.refresh();
  }

  function handleAddItem(groupId: string) {
    const raw = newItem[groupId]?.trim();
    if (!raw) return;

    if (parseChecklistCategoryItem(raw)) {
      startTransition(async () => {
        await submitBoardClassifiedInput(
          boardId,
          raw,
          defaultCategoryId,
          groupId,
        );
        setNewItem((prev) => ({ ...prev, [groupId]: "" }));
        setNewItemDate((prev) => ({ ...prev, [groupId]: "" }));
        setNewItemAmount((prev) => ({ ...prev, [groupId]: "" }));
        setAddingGroupId(null);
        refresh();
      });
      return;
    }

    const classified = classifyBoardInput(raw);
    const amountRaw = newItemAmount[groupId]?.trim() ?? "";
    const money = amountRaw
      ? parseBoardMoney(amountRaw)
      : { amount: classified.amount, currency: classified.currency };
    const dateStr = newItemDate[groupId];
    const dueAt = dateStr
      ? new Date(`${dateStr}T09:00:00`).toISOString()
      : classified.dueAt?.toISOString() ?? null;

    startTransition(async () => {
      await addChecklistItem(
        boardId,
        groupId,
        classified.cleanedContent,
        defaultCategoryId,
        {
          plannedAmount: money.amount,
          currency: money.currency,
          dueAt,
        },
      );
      setNewItem((prev) => ({ ...prev, [groupId]: "" }));
      setNewItemDate((prev) => ({ ...prev, [groupId]: "" }));
      setNewItemAmount((prev) => ({ ...prev, [groupId]: "" }));
      setAddingGroupId(null);
      refresh();
    });
  }

  function handleAddGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    startTransition(async () => {
      await addChecklistGroup(boardId, name);
      setNewGroupName("");
      refresh();
    });
  }

  function handleAddAi() {
    if (selectedAi.size === 0) return;
    startTransition(async () => {
      await addAiSuggestionsToChecklist(
        boardId,
        Array.from(selectedAi),
        defaultCategoryId,
      );
      setSelectedAi(new Set());
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>전체 {total}개</span>
          <span>완료 {done}개</span>
          <span className="font-semibold text-foreground">{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: boardColor }}
          />
        </div>
      </div>

      <BoardChecklistExcelUpload
        boardId={boardId}
        defaultCategoryId={defaultCategoryId}
      />

      {groups.map((group) => {
        const groupEntries = sortEntriesByChecklistOrder(
          checklistEntries.filter((e) => getGroupId(e) === group.id),
          group.id,
          itemOrder,
        );
        const gp = groupProgress(groupEntries);
        const groupDone = groupEntries.filter((e) => e.status === "done").length;

        return (
          <section key={group.id} className="space-y-2">
            <BoardChecklistGroupHeader
              boardId={boardId}
              group={group}
              itemCount={groupEntries.length}
              doneCount={groupDone}
              progress={gp}
              boardColor={boardColor}
              isAddingItem={addingGroupId === group.id}
              onStartAddItem={() =>
                setAddingGroupId((prev) =>
                  prev === group.id ? null : group.id,
                )
              }
              onCancelAddItem={() => setAddingGroupId(null)}
            />
            {addingGroupId === group.id && (
              <div
                className="group flex flex-wrap items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-2 py-1.5"
              >
                <Input
                  value={newItem[group.id] ?? ""}
                  onChange={(e) =>
                    setNewItem((prev) => ({
                      ...prev,
                      [group.id]: e.target.value,
                    }))
                  }
                  placeholder="항목 또는 카테고리/항목"
                  className="h-7 min-w-[80px] flex-1 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddItem(group.id);
                  }}
                />
                <div
                  className="flex shrink-0 items-center gap-1.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto"
                >
                  <Input
                    type="date"
                    value={newItemDate[group.id] ?? ""}
                    onChange={(e) =>
                      setNewItemDate((prev) => ({
                        ...prev,
                        [group.id]: e.target.value,
                      }))
                    }
                    className="h-7 w-[118px] text-xs tabular-nums"
                    aria-label="날짜"
                  />
                  <Input
                    value={newItemAmount[group.id] ?? ""}
                    onChange={(e) =>
                      setNewItemAmount((prev) => ({
                        ...prev,
                        [group.id]: e.target.value,
                      }))
                    }
                    placeholder="금액"
                    className="h-7 w-[72px] text-xs tabular-nums"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddItem(group.id);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    disabled={isPending || !newItem[group.id]?.trim()}
                    onClick={() => handleAddItem(group.id)}
                  >
                    추가
                  </Button>
                </div>
              </div>
            )}
            <BoardChecklistItemList
              boardId={boardId}
              groupId={group.id}
              entries={groupEntries}
            />
          </section>
        );
      })}

      <div className="flex gap-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="새 카테고리 이름"
          className="h-8 text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1"
          disabled={isPending}
          onClick={handleAddGroup}
        >
          <Plus className="h-3.5 w-3.5" />
          카테고리
        </Button>
      </div>

      {aiSuggestions.length > 0 && (
        <section className="rounded-lg border border-primary/20 bg-accent/30 p-3 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">AI 추천 준비물</h3>
          {metadata.destination && (
            <p className="text-xs text-muted-foreground">
              여행지: {metadata.destination}
              {metadata.season ? ` · 계절: ${metadata.season}` : ""}
            </p>
          )}
          <ul className="space-y-1.5">
            {aiSuggestions.map((s) => (
              <li key={s.id}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    size="sm"
                    checked={selectedAi.has(s.id)}
                    onCheckedChange={(v) => {
                      setSelectedAi((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(s.id);
                        else next.delete(s.id);
                        return next;
                      });
                    }}
                  />
                  {s.label}
                </label>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            disabled={isPending || selectedAi.size === 0}
            onClick={handleAddAi}
          >
            추가하기
          </Button>
        </section>
      )}
    </div>
  );
}
