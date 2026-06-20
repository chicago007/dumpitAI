"use client";

import { useState, useTransition } from "react";
import type { Category, Entry, EntryType } from "@/lib/types";
import {
  classifyContent,
  formatDueLabel,
  TYPE_LABELS,
} from "@/lib/classify";
import { CategoryDot } from "@/components/ui/category-dot";
import { TravelFields } from "@/components/travel/travel-fields";
import {
  formatAmountInput,
  formatCurrency,
  getTravelMeta,
  isTravelCategoryName,
  parseAmount,
  parseAmountInput,
  parseDestination,
} from "@/lib/travel";
import { deleteEntry, toggleEntryDone, updateEntry } from "@/actions/entries";

interface EntryItemProps {
  entry: Entry;
  categories: Category[];
  showCheckbox?: boolean;
  hideType?: boolean;
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatEntryDue(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export function EntryItem({
  entry,
  categories,
  showCheckbox = true,
  hideType = false,
}: EntryItemProps) {
  const category = entry.categories as Category | null | undefined;
  const travelMeta = getTravelMeta(entry.metadata ?? {});
  const isDone = entry.status === "done";
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [type, setType] = useState<EntryType>(entry.type);
  const [categoryId, setCategoryId] = useState(
    entry.category_id ?? categories[0]?.id ?? "",
  );
  const [dueDate, setDueDate] = useState(toDateInputValue(entry.due_at));
  const [destination, setDestination] = useState(travelMeta.destination ?? "");
  const [amount, setAmount] = useState(formatAmountInput(travelMeta.amount));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editingCategory = categories.find((c) => c.id === categoryId);
  const isTravel = isTravelCategoryName(editingCategory?.name);

  function applyTravelFromContent(value: string) {
    const dest = parseDestination(value);
    const parsedAmount = parseAmount(value);
    if (dest) setDestination(dest);
    if (parsedAmount !== null) setAmount(formatAmountInput(parsedAmount));
  }

  function resetForm() {
    const meta = getTravelMeta(entry.metadata ?? {});
    setContent(entry.content);
    setType(entry.type);
    setCategoryId(entry.category_id ?? categories[0]?.id ?? "");
    setDueDate(toDateInputValue(entry.due_at));
    setDestination(meta.destination ?? "");
    setAmount(formatAmountInput(meta.amount));
    setError(null);
    setIsEditing(false);
  }

  function handleContentChange(value: string) {
    setContent(value);
    setError(null);
    if (value.trim().length > 0) {
      const result = classifyContent(value, categories);
      setType(result.type);
      if (result.categoryId) {
        setCategoryId(result.categoryId);
        const cat = categories.find((c) => c.id === result.categoryId);
        if (isTravelCategoryName(cat?.name)) {
          applyTravelFromContent(value);
        }
      }
      if (result.dueAt) setDueDate(result.dueAt.toISOString().slice(0, 10));
      if (isTravel) applyTravelFromContent(value);
    }
  }

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (isTravelCategoryName(cat?.name) && content.trim()) {
      applyTravelFromContent(content);
    }
    if (!isTravelCategoryName(cat?.name)) {
      setDestination("");
      setAmount("");
    }
  }

  function handleSave() {
    if (!content.trim()) return;

    startTransition(async () => {
      try {
        await updateEntry({
          id: entry.id,
          content,
          type,
          categoryId,
          dueAt: dueDate ? new Date(`${dueDate}T09:00:00`).toISOString() : null,
          destination: isTravel ? destination || null : null,
          amount: isTravel ? parseAmountInput(amount) : null,
        });
        setIsEditing(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "수정에 실패했습니다.");
      }
    });
  }

  const dueLabel = dueDate
    ? formatDueLabel(new Date(`${dueDate}T09:00:00`))
    : null;

  if (isEditing) {
    return (
      <li className="py-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-1">
            {(["memo", "todo", "schedule", "checklist"] as EntryType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  type === t
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  categoryId === cat.id
                    ? "text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                style={
                  categoryId === cat.id
                    ? { backgroundColor: cat.color }
                    : undefined
                }
              >
                {cat.name}
              </button>
            ))}
          </div>

          {isTravel && (
            <TravelFields
              destination={destination}
              amount={amount}
              onDestinationChange={setDestination}
              onAmountChange={setAmount}
            />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate("")}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                제거
              </button>
            )}
            {dueLabel && (
              <span className="text-xs text-slate-600">{dueLabel}</span>
            )}
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!content.trim() || isPending}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isPending}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              취소
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-2.5">
      {showCheckbox && (
        <form action={toggleEntryDone.bind(null, entry.id, !isDone)}>
          <button
            type="submit"
            className={`h-4 w-4 shrink-0 rounded border transition-colors ${
              isDone
                ? "border-slate-900 bg-slate-900"
                : "border-slate-300 hover:border-slate-500"
            }`}
            aria-label={isDone ? "완료 취소" : "완료"}
          />
        </form>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p
          className={`min-w-0 truncate text-sm ${
            isDone ? "text-slate-400 line-through" : "text-slate-800"
          }`}
        >
          {entry.content}
        </p>
        {category && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${category.color}18`,
              color: category.color,
            }}
          >
            <CategoryDot color={category.color} />
            {category.name}
          </span>
        )}
        {!hideType && (
          <span className="shrink-0 text-xs text-slate-400">
            {TYPE_LABELS[entry.type]}
          </span>
        )}
        {entry.due_at && (
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {formatEntryDue(entry.due_at)}
          </span>
        )}
        {travelMeta.destination && (
          <span className="shrink-0 text-xs text-slate-400">
            {travelMeta.destination}
          </span>
        )}
        {travelMeta.amount !== null && (
          <span className="shrink-0 text-xs text-slate-400">
            {formatCurrency(travelMeta.amount)}
          </span>
        )}
        {isDone && entry.completed_at && (
          <span className="shrink-0 text-xs text-slate-400">완료</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="수정"
        >
          <PencilIcon />
        </button>
        <form action={deleteEntry.bind(null, entry.id)}>
          <button
            type="submit"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label="삭제"
          >
            <TrashIcon />
          </button>
        </form>
      </div>
    </li>
  );
}
