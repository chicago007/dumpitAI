"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import {
  addBoardExpenseCategory,
  deleteBoardExpenseCategory,
  updateBoardExpenseCategoryName,
} from "@/actions/boards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardBudgetCategory, BoardMetadata } from "@/lib/board-types";
import { resolveExpenseCategories } from "@/lib/board-expense-categories";
import { cn } from "@/lib/utils";

interface BoardExpenseCategoryListProps {
  boardId: string;
  metadata: BoardMetadata;
  /** + 지출 추가 등 왼쪽 헤더와 한 줄에 배치 */
  headerLeft?: ReactNode;
  children?: ReactNode;
}

export function BoardExpenseCategoryList({
  boardId,
  metadata,
  headerLeft,
  children,
}: BoardExpenseCategoryListProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const categories = resolveExpenseCategories(metadata);
  const expenses = metadata.expenses ?? [];
  const embedded = headerLeft != null;

  function refresh() {
    router.refresh();
  }

  function runAction(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "처리에 실패했습니다.",
        );
      }
    });
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    runAction(async () => {
      await addBoardExpenseCategory(boardId, trimmed);
      setNewName("");
    });
  }

  function startEdit(cat: BoardBudgetCategory) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setError(null);
  }

  function handleSaveEdit(categoryId: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    runAction(async () => {
      await updateBoardExpenseCategoryName(boardId, categoryId, trimmed);
      setEditingId(null);
    });
  }

  function handleDelete(cat: BoardBudgetCategory) {
    const count = expenses.filter((e) => e.category === cat.name).length;
    const msg =
      count > 0
        ? `"${cat.name}" 카테고리를 삭제할까요? ${count}개 지출은 '기타'로 이동합니다.`
        : `"${cat.name}" 카테고리를 삭제할까요?`;
    if (!confirm(msg)) return;

    runAction(async () => {
      await deleteBoardExpenseCategory(boardId, cat.id);
      if (editingId === cat.id) setEditingId(null);
    });
  }

  const toggleButton = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={cn(
        "flex items-center gap-2 text-left transition-colors hover:bg-accent/40",
        embedded
          ? "shrink-0 rounded-lg border border-border/50 px-2.5 py-1.5"
          : "w-full rounded-lg px-3 py-2.5",
      )}
      aria-expanded={open}
    >
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
          !open && "-rotate-90",
        )}
      />
      <span className="text-sm font-medium text-foreground">지출 카테고리</span>
      <span className="shrink-0 text-xs font-medium text-primary">
        {open ? "접기" : "펼치기"}
      </span>
    </button>
  );

  const expandedPanel = open && (
    <div className="space-y-2 border-t border-border/50 p-3">
      <ul className="space-y-1">
        {categories.map((cat) =>
          editingId === cat.id ? (
            <li key={cat.id} className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit(cat.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0"
                disabled={isPending}
                onClick={() => handleSaveEdit(cat.id)}
              >
                저장
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 shrink-0"
                onClick={() => setEditingId(null)}
              >
                취소
              </Button>
            </li>
          ) : (
            <li
              key={cat.id}
              className="group flex items-center justify-between gap-2 rounded-md px-1 py-1 text-sm"
            >
              <span className="text-foreground">{cat.name}</span>
              <div className="flex shrink-0 gap-0.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => startEdit(cat)}
                  aria-label={`${cat.name} 수정`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:text-destructive"
                  disabled={categories.length <= 1}
                  onClick={() => handleDelete(cat)}
                  aria-label={`${cat.name} 삭제`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>

      <div className="flex gap-2 pt-1">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="새 카테고리"
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1"
          disabled={isPending || !newName.trim()}
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          추가
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );

  if (embedded) {
    return (
      <section className="rounded-lg border border-border/50">
        <div className="flex items-center justify-between gap-2 p-3 pb-2">
          <div className="shrink-0">{headerLeft}</div>
          {toggleButton}
        </div>
        {expandedPanel}
        {children && <div className="space-y-3 px-3 pb-3">{children}</div>}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border/50">
      {toggleButton}
      {expandedPanel}
    </section>
  );
}
