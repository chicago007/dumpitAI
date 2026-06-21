"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  deleteChecklistGroup,
  updateChecklistGroupName,
} from "@/actions/boards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardChecklistGroup } from "@/lib/board-types";
import { cn } from "@/lib/utils";

interface BoardChecklistGroupHeaderProps {
  boardId: string;
  group: BoardChecklistGroup;
  itemCount: number;
  doneCount: number;
  progress: number;
  boardColor: string;
  isAddingItem?: boolean;
  onStartAddItem?: () => void;
  onCancelAddItem?: () => void;
}

export function BoardChecklistGroupHeader({
  boardId,
  group,
  itemCount,
  doneCount,
  progress,
  boardColor,
  isAddingItem = false,
  onStartAddItem,
  onCancelAddItem,
}: BoardChecklistGroupHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      await updateChecklistGroupName(boardId, group.id, trimmed);
      setIsEditing(false);
      refresh();
    });
  }

  function handleDelete() {
    const msg =
      itemCount > 0
        ? `"${group.name}" 카테고리와 포함된 ${itemCount}개 항목을 삭제할까요?`
        : `"${group.name}" 카테고리를 삭제할까요?`;
    if (!confirm(msg)) return;

    startTransition(async () => {
      await deleteChecklistGroup(boardId, group.id);
      refresh();
    });
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm font-semibold"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setName(group.name);
              setIsEditing(false);
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0"
          disabled={isPending}
          onClick={handleSave}
        >
          저장
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0"
          disabled={isPending}
          onClick={() => {
            setName(group.name);
            setIsEditing(false);
          }}
        >
          취소
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-0.5">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {group.name}
        </h3>
        {onStartAddItem && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 shrink-0 px-1.5 text-xs text-primary transition-opacity",
              isAddingItem
                ? "opacity-100"
                : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto",
            )}
            disabled={isPending}
            onClick={() =>
              isAddingItem ? onCancelAddItem?.() : onStartAddItem()
            }
          >
            {isAddingItem ? "취소" : "+항목"}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
          disabled={isPending}
          onClick={() => setIsEditing(true)}
          aria-label="카테고리 이름 수정"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto hover:text-destructive focus-visible:opacity-100 focus-visible:pointer-events-auto"
          disabled={isPending}
          onClick={handleDelete}
          aria-label="카테고리 삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: boardColor,
            }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {doneCount}/{itemCount}
        </span>
      </div>
    </div>
  );
}
