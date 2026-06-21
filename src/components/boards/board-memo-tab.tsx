"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBoardMemo } from "@/actions/boards";
import { BoardEditableEntryRow } from "@/components/boards/board-editable-entry-row";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Entry } from "@/lib/types";

interface BoardMemoTabProps {
  boardId: string;
  entries: Entry[];
  defaultCategoryId: string;
}

export function BoardMemoTab({
  boardId,
  entries,
  defaultCategoryId,
}: BoardMemoTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");

  const memos = entries.filter((e) => e.type === "memo");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addBoardMemo(boardId, trimmed, defaultCategoryId);
      setContent("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="메모 (맛집, 쇼핑, 주의사항 등 자유롭게)"
          rows={4}
          className="text-sm resize-none"
        />
        <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
          메모 저장
        </Button>
      </form>

      {memos.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          저장된 메모가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {memos.map((memo) => (
            <li
              key={memo.id}
              className="rounded-lg border border-border/50 bg-muted/20 px-2 py-1"
            >
              <BoardEditableEntryRow
                entry={memo}
                boardId={boardId}
                variant="memo"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
