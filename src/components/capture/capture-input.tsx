"use client";

import { useState, useTransition } from "react";
import type { Category, EntryType } from "@/lib/types";
import {
  classifyContent,
  formatDueLabel,
  TYPE_LABELS,
} from "@/lib/classify";
import {
  formatAmountInput,
  formatCurrency,
  isTravelCategoryName,
  parseAmount,
  parseAmountInput,
  parseDestination,
} from "@/lib/travel";
import { TravelFields } from "@/components/travel/travel-fields";
import { createEntry } from "@/actions/entries";

interface CaptureInputProps {
  categories: Category[];
}

export function CaptureInput({ categories }: CaptureInputProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<EntryType>("memo");
  const [categoryId, setCategoryId] = useState<string>(
    categories.find((c) => c.name === "기타")?.id ?? categories[0]?.id ?? "",
  );
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [learnKeyword, setLearnKeyword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isTravel = isTravelCategoryName(selectedCategory?.name);

  function applyTravelFromContent(value: string) {
    const dest = parseDestination(value);
    const parsedAmount = parseAmount(value);
    if (dest) setDestination(dest);
    if (parsedAmount !== null) setAmount(formatAmountInput(parsedAmount));
  }

  function handleChange(value: string) {
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
      setDueAt(result.dueAt);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      try {
        await createEntry({
          content,
          type,
          categoryId,
          dueAt: dueAt?.toISOString() ?? null,
          learnKeyword,
          destination: isTravel ? destination || null : null,
          amount: isTravel ? parseAmountInput(amount) : null,
        });
        setContent("");
        setType("memo");
        setDueAt(null);
        setDestination("");
        setAmount("");
        setLearnKeyword(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  const dueLabel = formatDueLabel(dueAt);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="생각나는 대로 한 줄 입력하세요... (예: 제주도 항공권 15만원)"
          rows={3}
          className="w-full resize-none rounded-t-lg border-0 bg-transparent px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
        />

        {content.trim().length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-slate-500">미리보기</p>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {TYPE_LABELS[type]}
              </span>
              {selectedCategory && (
                <span
                  className="rounded-md px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `${selectedCategory.color}15`,
                    color: selectedCategory.color,
                  }}
                >
                  {selectedCategory.name}
                </span>
              )}
              {dueLabel && (
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {dueLabel}
                </span>
              )}
              {isTravel && destination && (
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {destination}
                </span>
              )}
              {isTravel && parseAmountInput(amount) !== null && (
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {formatCurrency(parseAmountInput(amount)!)}
                </span>
              )}
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">타입</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EntryType)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {(["memo", "todo", "schedule", "checklist"] as EntryType[]).map(
                    (t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  카테고리
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {isTravel && (
              <TravelFields
                destination={destination}
                amount={amount}
                onDestinationChange={setDestination}
                onAmountChange={setAmount}
              />
            )}

            <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={learnKeyword}
                onChange={(e) => setLearnKeyword(e.target.checked)}
                className="rounded border-slate-300"
              />
              이 분류를 기억하기 (키워드 학습)
            </label>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!content.trim() || isPending}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
