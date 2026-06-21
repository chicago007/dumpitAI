"use client";

import { useState, useTransition } from "react";
import type { Category, EntryType, Space } from "@/lib/types";
import {
  classifyContent,
  extractDueDate,
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
  TRAVEL_CATEGORY_NAME,
} from "@/lib/travel";
import { TravelFields } from "@/components/travel/travel-fields";
import { TravelPlanPreview } from "@/components/travel/travel-plan-preview";
import { createEntry } from "@/actions/entries";
import { createTravelPlan } from "@/actions/travel-plan";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import {
  parseTravelContext,
} from "@/lib/travel-plan";
import type { Entry } from "@/lib/types";
import type { TravelChecklistGroup } from "@/lib/travel-checklist-template";

interface CaptureInputProps {
  categories: Category[];
  prepEntries?: Entry[];
  travelTemplate?: TravelChecklistGroup[];
  activeSpace?: Space;
}

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <path d="M12 18v4M8 22h8" />
    </svg>
  );
}

export function CaptureInput({
  categories,
  prepEntries = [],
  travelTemplate,
  activeSpace = "personal",
}: CaptureInputProps) {
  const isPersonal = activeSpace === "personal";
  const defaultCategoryName = activeSpace === "work" ? "업무" : "기타";

  const [content, setContent] = useState("");
  const [type, setType] = useState<EntryType>("memo");
  const [categoryId, setCategoryId] = useState<string>(
    categories.find((c) => c.name === defaultCategoryName)?.id ??
      categories[0]?.id ??
      "",
  );
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [learnKeyword, setLearnKeyword] = useState(false);
  const [createTravelChecklist, setCreateTravelChecklist] = useState(false);
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
      const travelCtx = isPersonal ? parseTravelContext(value) : null;
      if (travelCtx) {
        setCreateTravelChecklist(true);
        const travelCat = categories.find((c) => c.name === TRAVEL_CATEGORY_NAME);
        if (travelCat) setCategoryId(travelCat.id);
        if (travelCtx.departureDate) setDueAt(travelCtx.departureDate);
        if (travelCtx.destination !== "미지정") {
          setDestination(travelCtx.destination);
        }
        setType("schedule");
      } else {
        setCreateTravelChecklist(false);
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
  }

  const onSpeechTranscript = (text: string) => handleChange(text);

  const {
    isListening,
    isSupported,
    speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition(onSpeechTranscript);

  function toggleVoiceInput() {
    if (isListening) {
      stopListening();
      return;
    }
    startListening(content);
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

    const { date: extractedDate, cleaned } = extractDueDate(content);
    const finalDue = extractedDate ?? dueAt;
    const finalContent = extractedDate && cleaned ? cleaned : content;

    startTransition(async () => {
      try {
        const travelCtx = parseTravelContext(
          content,
          destination || null,
          finalDue,
        );

        const travelCategoryId =
          categories.find((c) => c.name === TRAVEL_CATEGORY_NAME)?.id ??
          categoryId;

        if (travelCtx && createTravelChecklist && isPersonal) {
          await createTravelPlan({
            content: finalContent || content,
            categoryId: travelCategoryId,
            destination: destination || travelCtx.destination,
            departureDate: finalDue?.toISOString() ?? null,
            season: travelCtx.season,
          });
        } else {
          await createEntry({
            content: finalContent,
            type,
            categoryId,
            dueAt: finalDue?.toISOString() ?? null,
            learnKeyword,
            destination: isTravel ? destination || null : null,
            amount: isTravel ? parseAmountInput(amount) : null,
          });
        }
        setContent("");
        setType("memo");
        setDueAt(null);
        setDestination("");
        setAmount("");
        setLearnKeyword(false);
        setCreateTravelChecklist(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  const dueLabel = formatDueLabel(dueAt);
  const preview = extractDueDate(content);
  const willStripDate =
    !!preview.date && preview.cleaned !== content.trim() && !!preview.cleaned;
  const travelCtx =
    isPersonal && content.trim().length > 0
      ? parseTravelContext(content, destination || null, dueAt)
      : null;
  const suggestsTravelChecklist = travelCtx !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="생각나는 대로 입력… (예: 8월말 동경 여행, 6월 20일 회의)"
            rows={3}
            className="w-full resize-none rounded-t-lg border-0 bg-transparent px-4 py-3 pr-12 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
          {isSupported && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`absolute bottom-3 right-3 rounded-full p-2 transition-colors ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              aria-label={
                isListening ? "음성 입력 중지" : "음성으로 입력"
              }
              title={isListening ? "음성 입력 중지" : "음성으로 입력"}
            >
              <MicIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        {isListening && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-red-600">
            말씀해 주세요… (마이크 버튼을 다시 누르면 중지)
          </p>
        )}
        {speechError && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-red-600">
            {speechError}
          </p>
        )}

        {content.trim().length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-slate-500">미리보기</p>
            {willStripDate && (
              <p className="mb-2 text-xs text-slate-600">
                저장 내용:{" "}
                <span className="font-medium text-slate-800">
                  {preview.cleaned}
                </span>
              </p>
            )}
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
              {destination && (
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {destination}
                </span>
              )}
              {(isTravel || travelCtx) && parseAmountInput(amount) !== null && (
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

            <div className="mb-3">
              <label className="mb-1 block text-xs text-slate-500">일정 날짜</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={toDateInputValue(dueAt)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDueAt(new Date(`${e.target.value}T09:00:00`));
                      setType("schedule");
                    } else {
                      setDueAt(null);
                    }
                  }}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                />
                {dueAt && (
                  <button
                    type="button"
                    onClick={() => setDueAt(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    날짜 제거
                  </button>
                )}
              </div>
            </div>

            {(isTravel || travelCtx) && (
              <TravelFields
                destination={destination}
                amount={amount}
                onDestinationChange={setDestination}
                onAmountChange={setAmount}
              />
            )}

            {suggestsTravelChecklist && (
              <TravelPlanPreview
                content={content}
                destination={destination}
                departureDate={dueAt}
                prepEntries={prepEntries}
                template={travelTemplate}
              />
            )}

            {suggestsTravelChecklist && (
              <label className="mt-3 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50/50 px-3 py-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={createTravelChecklist}
                  onChange={(e) => setCreateTravelChecklist(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300"
                />
                <span>
                  <span className="font-medium text-sky-900">
                    여행 준비 할일 자동 생성
                  </span>
                  <span className="mt-0.5 block text-slate-500">
                    일정 + 체크리스트 항목(비행기표, 호텔, 라면 등)을 할일로
                    만듭니다.
                  </span>
                </span>
              </label>
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
        {isPending
          ? "저장 중..."
          : suggestsTravelChecklist && createTravelChecklist
            ? "여행 저장 (일정 + 할일 생성)"
            : "저장"}
      </button>
    </form>
  );
}
