"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { reorderChecklistItems } from "@/actions/boards";
import { BoardEditableEntryRow } from "@/components/boards/board-editable-entry-row";
import type { Entry } from "@/lib/types";

interface BoardChecklistItemListProps {
  boardId: string;
  groupId: string;
  entries: Entry[];
}

export function BoardChecklistItemList({
  boardId,
  groupId,
  entries,
}: BoardChecklistItemListProps) {
  const router = useRouter();
  const [items, setItems] = useState(entries);
  const [dragId, setDragId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(entries);
  }, [entries]);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;

    const from = items.findIndex((e) => e.id === dragId);
    const to = items.findIndex((e) => e.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setDragId(null);

    startTransition(async () => {
      await reorderChecklistItems(boardId, groupId, next.map((e) => e.id));
      router.refresh();
    });
  }

  return (
    <ul className="space-y-0.5">
      {items.map((entry) => (
        <li
          key={entry.id}
          className={`group/item flex items-start gap-0.5 rounded-md transition-colors ${
            dragId === entry.id ? "opacity-50" : ""
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(entry.id)}
        >
          <button
            type="button"
            className="mt-0.5 shrink-0 touch-none cursor-grab rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-50 hover:!opacity-100 active:cursor-grabbing"
            draggable
            onDragStart={() => setDragId(entry.id)}
            onDragEnd={() => setDragId(null)}
            aria-label="순서 변경"
            disabled={isPending}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-0 flex-1">
            <BoardEditableEntryRow
              entry={entry}
              boardId={boardId}
              variant="checklist"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
