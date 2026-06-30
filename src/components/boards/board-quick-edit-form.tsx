"use client";

import { useState, useTransition } from "react";
import { updateBoard } from "@/actions/boards";
import { PROJECT_LABEL } from "@/lib/project-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BoardQuickEditFormProps {
  boardId: string;
  initialName: string;
  initialStartDate: string | null;
  initialEndDate: string | null;
  color: string;
  onSaved: (name: string) => void;
  onCancel: () => void;
}

export function BoardQuickEditForm({
  boardId,
  initialName,
  initialStartDate,
  initialEndDate,
  color,
  onSaved,
  onCancel,
}: BoardQuickEditFormProps) {
  const [name, setName] = useState(initialName);
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;

    startTransition(async () => {
      await updateBoard(boardId, {
        name: trimmed,
        startDate: startDate || null,
        endDate: endDate || null,
      });
      onSaved(trimmed);
    });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className="shrink-0 text-sm font-bold leading-none"
          style={{ color }}
          aria-hidden
        >
          ■
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 flex-1 text-sm"
          placeholder={`${PROJECT_LABEL} 이름`}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-5">
        <span className="text-xs text-muted-foreground shrink-0">기간</span>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-8 w-auto text-sm"
          aria-label="시작일"
        />
        <span className="text-xs text-muted-foreground">~</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-8 w-auto text-sm"
          aria-label="종료일"
        />
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            size="sm"
            className="h-8 px-2.5 text-xs"
            disabled={isPending}
            onClick={handleSave}
          >
            저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-xs"
            disabled={isPending}
            onClick={onCancel}
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}
