"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteBoard, updateBoard } from "@/actions/boards";
import { PROJECT_LABEL } from "@/lib/project-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BoardInlineActionsProps {
  boardId: string;
  initialName: string;
  /** 삭제 후 이동 경로. null이면 refresh만 */
  redirectOnDelete?: string | null;
  onNameUpdated?: (name: string) => void;
  onDeleted?: () => void;
}

export function BoardInlineActions({
  boardId,
  initialName,
  redirectOnDelete = null,
  onNameUpdated,
  onDeleted,
}: BoardInlineActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      await updateBoard(boardId, { name: trimmed });
      setIsEditing(false);
      onNameUpdated?.(trimmed);
      refresh();
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `"${initialName}" ${PROJECT_LABEL}를 삭제할까요?\n연결된 할 일은 ${PROJECT_LABEL}에서만 분리됩니다.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await deleteBoard(boardId);
      if (redirectOnDelete) {
        router.push(redirectOnDelete);
      } else {
        onDeleted?.();
        refresh();
      }
    });
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setName(initialName);
              setIsEditing(false);
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={isPending}
          onClick={handleSave}
        >
          저장
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          disabled={isPending}
          onClick={() => {
            setName(initialName);
            setIsEditing(false);
          }}
        >
          취소
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 gap-0.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground"
        disabled={isPending}
        onClick={() => setIsEditing(true)}
        aria-label={`${PROJECT_LABEL} 이름 수정`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        disabled={isPending}
        onClick={handleDelete}
        aria-label={`${PROJECT_LABEL} 삭제`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
