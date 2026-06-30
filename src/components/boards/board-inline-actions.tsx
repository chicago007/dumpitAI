"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteBoard, updateBoard } from "@/actions/boards";
import { PROJECT_LABEL } from "@/lib/project-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BoardInlineActionsProps {
  boardId: string;
  initialName: string;
  initialStartDate?: string | null;
  initialEndDate?: string | null;
  /** 목록에서 부모가 전체 행 편집을 처리할 때 */
  onStartEdit?: () => void;
  /** 삭제 후 이동 경로. null이면 refresh만 */
  redirectOnDelete?: string | null;
  onNameUpdated?: (name: string) => void;
  onDeleted?: () => void;
}

export function BoardInlineActions({
  boardId,
  initialName,
  initialStartDate = null,
  initialEndDate = null,
  onStartEdit,
  redirectOnDelete = null,
  onNameUpdated,
  onDeleted,
}: BoardInlineActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setName(initialName);
    setStartDate(initialStartDate ?? "");
    setEndDate(initialEndDate ?? "");
  }, [initialName, initialStartDate, initialEndDate]);

  function refresh() {
    router.refresh();
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      await updateBoard(boardId, {
        name: trimmed,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      setIsEditing(false);
      onNameUpdated?.(trimmed);
      refresh();
    });
  }

  function beginEdit() {
    if (onStartEdit) {
      onStartEdit();
      return;
    }
    setIsEditing(true);
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
      <div className="flex min-w-[220px] flex-col gap-2 py-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setName(initialName);
              setStartDate(initialStartDate ?? "");
              setEndDate(initialEndDate ?? "");
              setIsEditing(false);
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-7 w-auto text-xs"
            aria-label="시작일"
          />
          <span className="text-xs text-muted-foreground">~</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-7 w-auto text-xs"
            aria-label="종료일"
          />
        </div>
        <div className="flex gap-1">
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
              setStartDate(initialStartDate ?? "");
              setEndDate(initialEndDate ?? "");
              setIsEditing(false);
            }}
          >
            취소
          </Button>
        </div>
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
        onClick={beginEdit}
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
