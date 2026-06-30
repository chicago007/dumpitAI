"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBoardDateRange } from "@/actions/boards";
import { formatBoardDateRange } from "@/lib/board-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BoardPeriodEditorProps {
  boardId: string;
  startDate: string | null;
  endDate: string | null;
  inline?: boolean;
}

export function BoardPeriodEditor({
  boardId,
  startDate,
  endDate,
  inline = false,
}: BoardPeriodEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [start, setStart] = useState(startDate ?? "");
  const [end, setEnd] = useState(endDate ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStart(startDate ?? "");
    setEnd(endDate ?? "");
  }, [startDate, endDate]);

  const label = formatBoardDateRange(startDate, endDate);

  function handleSave() {
    if (!start || !end) return;
    startTransition(async () => {
      await updateBoardDateRange(boardId, start, end);
      setIsEditing(false);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <div
        className={
          inline
            ? "flex flex-wrap items-center gap-2"
            : "mt-1 flex flex-wrap items-center gap-2"
        }
      >
        <Input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="h-8 w-auto text-sm"
          disabled={isPending}
          aria-label="시작일"
        />
        <span className="text-xs text-muted-foreground">~</span>
        <Input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="h-8 w-auto text-sm"
          disabled={isPending}
          aria-label="종료일"
        />
        <Button
          type="button"
          size="sm"
          className="h-8 px-2 text-xs"
          disabled={isPending || !start || !end}
          onClick={handleSave}
        >
          저장
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          disabled={isPending}
          onClick={() => {
            setStart(startDate ?? "");
            setEnd(endDate ?? "");
            setIsEditing(false);
          }}
        >
          취소
        </Button>
      </div>
    );
  }

  if (label) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className={
          inline
            ? "text-sm text-muted-foreground hover:text-foreground"
            : "mt-0.5 text-sm text-muted-foreground hover:text-foreground"
        }
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={
        inline
          ? "text-xs text-muted-foreground/70 hover:text-muted-foreground"
          : "mt-0.5 text-sm text-muted-foreground/70 hover:text-muted-foreground"
      }
    >
      {inline ? "기간 설정" : "기간 미설정 · `8월 1일 ~ 10일` 입력"}
    </button>
  );
}
