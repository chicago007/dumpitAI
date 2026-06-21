"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { createEntry } from "@/actions/entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BoardQuickAddProps {
  boardId: string;
  categories: Category[];
  defaultCategoryId: string;
}

export function BoardQuickAdd({
  boardId,
  categories,
  defaultCategoryId,
}: BoardQuickAddProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    startTransition(async () => {
      await createEntry({
        content: trimmed,
        type: "todo",
        categoryId: defaultCategoryId,
        boardId,
      });
      setContent("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="할 일 추가…"
        className="text-sm"
        disabled={isPending}
      />
      <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
        추가
      </Button>
    </form>
  );
}
