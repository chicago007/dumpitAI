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
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function EntryItem({
  entry,
  categories,
  showCheckbox = true,
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
    <li className="flex items-start gap-3 py-3">
      {showCheckbox && (
        <form action={toggleEntryDone.bind(null, entry.id, !isDone)}>
          <button
            type="submit"
            className={`mt-1 h-4 w-4 shrink-0 rounded border transition-colors ${
              isDone
                ? "border-slate-900 bg-slate-900"
                : "border-slate-300 hover:border-slate-500"
            }`}
            aria-label={isDone ? "완료 취소" : "완료"}
          />
        </form>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${
            isDone ? "text-slate-400 line-through" : "text-slate-800"
          }`}
        >
          {entry.content}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{TYPE_LABELS[entry.type]}</span>
          {category && (
            <span className="inline-flex items-center gap-1.5">
              <CategoryDot color={category.color} />
              <span style={{ color: category.color }}>{category.name}</span>
            </span>
          )}
          {travelMeta.destination && (
            <span>{travelMeta.destination}</span>
          )}
          {travelMeta.amount !== null && (
            <span>{formatCurrency(travelMeta.amount)}</span>
          )}
          {entry.due_at && (
            <span>
              {new Date(entry.due_at).toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {isDone && entry.completed_at && (
            <span className="text-slate-400">완료</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-slate-500 hover:text-slate-800"
        >
          수정
        </button>
        <form action={deleteEntry.bind(null, entry.id)}>
          <button
            type="submit"
            className="text-xs text-slate-500 hover:text-red-600"
          >
            삭제
          </button>
        </form>
      </div>
    </li>
  );
}
