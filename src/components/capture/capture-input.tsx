"use client";

import { useState, useTransition } from "react";
import type { Category, EntryType } from "@/lib/types";
import type { Space, ViewSpace } from "@/lib/spaces";
import { getDefaultCategoryNameForSpace } from "@/lib/spaces";
import { parseSpaceInputPrefix } from "@/lib/space-input";
import {
  classifyContent,
  extractDueDate,
  formatDueLabel,
  TYPE_LABELS,
} from "@/lib/classify";
import {
  formatAmountInput,
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mic, ChevronDown, Calendar, CheckCircle2, ClipboardList, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENTRY_TYPE_THEMES } from "@/lib/entry-type-theme";

interface CaptureInputProps {
  categories: Category[];
  prepEntries?: Entry[];
  travelTemplate?: TravelChecklistGroup[];
  activeViewSpace?: ViewSpace;
}

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pickCategoryForSpace(categories: Category[], space: Space) {
  const preferred = getDefaultCategoryNameForSpace(space);
  return (
    categories.find((c) => c.space === space && c.name === preferred) ??
    categories.find((c) => c.space === space) ??
    categories[0]
  );
}

export function CaptureInput({
  categories,
  prepEntries = [],
  travelTemplate,
  activeViewSpace = "personal",
}: CaptureInputProps) {
  const isPersonal = activeViewSpace !== "work";
  const defaultSpace: Space =
    activeViewSpace === "all" ? "personal" : activeViewSpace;
  const defaultCategoryName = getDefaultCategoryNameForSpace(defaultSpace);

  const [content, setContent] = useState("");
  const [type, setType] = useState<EntryType>("memo");
  const [categoryId, setCategoryId] = useState<string>(
    pickCategoryForSpace(categories, defaultSpace)?.id ?? "",
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

  function saveContent() {
    if (!content.trim() || isPending) return;

    const spaceParsed = parseSpaceInputPrefix(content, activeViewSpace);
    const { date: extractedDate, cleaned } = extractDueDate(spaceParsed.content);
    const finalDue = extractedDate ?? dueAt;
    const finalContent =
      extractedDate && cleaned ? cleaned : spaceParsed.content;
    const targetSpace = spaceParsed.targetSpace;
    const targetCategory = pickCategoryForSpace(categories, targetSpace);

    if (!targetCategory) {
      setError("해당 공간의 카테고리를 찾을 수 없습니다.");
      return;
    }

    startTransition(async () => {
      try {
        const travelCtx = parseTravelContext(
          spaceParsed.content,
          destination || null,
          finalDue,
        );

        const travelCategoryId =
          categories.find(
            (c) => c.name === TRAVEL_CATEGORY_NAME && c.space === "personal",
          )?.id ?? targetCategory.id;

        if (travelCtx && createTravelChecklist && targetSpace === "personal") {
          await createTravelPlan({
            content: finalContent || spaceParsed.content,
            categoryId: travelCategoryId,
            destination: destination || travelCtx.destination,
            departureDate: finalDue?.toISOString() ?? null,
            season: travelCtx.season,
          });
        } else {
          await createEntry({
            content: finalContent,
            type,
            categoryId: targetCategory.id,
            dueAt: finalDue?.toISOString() ?? null,
            learnKeyword,
            destination: isTravel ? destination || null : null,
            amount: isTravel ? parseAmountInput(amount) : null,
            space: targetSpace,
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveContent();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    if (e.shiftKey) return;

    e.preventDefault();
    saveContent();
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

  const typeColor = ENTRY_TYPE_THEMES[type].color;
  const previewLabel = dueLabel
    ? `${TYPE_LABELS[type]} · ${dueLabel}`
    : TYPE_LABELS[type];
  const TypePreviewIcon =
    type === "memo"
      ? StickyNote
      : type === "todo"
        ? CheckCircle2
        : type === "schedule"
          ? Calendar
          : ClipboardList;

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <Card className="overflow-hidden border-border/60 shadow-card">
        <div className="relative">
          <Textarea
            id="capture-input"
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeViewSpace === "all"
                ? "생각나는 대로 입력… /업무 /개인 · Enter 저장"
                : "생각나는 대로 입력… Enter로 저장"
            }
            rows={2}
            className="min-h-[64px] resize-none rounded-none border-0 bg-transparent px-4 py-3 pr-12 text-[15px] shadow-none focus-visible:ring-0"
          />
          {isSupported && (
            <Button
              type="button"
              variant={isListening ? "destructive" : "ghost"}
              size="icon"
              onClick={toggleVoiceInput}
              className={cn(
                "absolute right-2 top-2 h-8 w-8 rounded-lg text-muted-foreground",
                isListening && "animate-pulse text-destructive",
              )}
              aria-label={
                isListening ? "음성 입력 중지" : "음성으로 입력"
              }
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
        {isListening && (
          <p className="border-t border-border/50 px-4 py-1.5 text-xs text-destructive">
            말씀해 주세요… (마이크 버튼을 다시 누르면 중지)
          </p>
        )}
        {speechError && (
          <p className="border-t border-border/50 px-4 py-1.5 text-xs text-destructive">
            {speechError}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-border/50 px-4 py-2.5">
          <span className="shrink-0 text-xs text-muted-foreground">
            분류 미리보기
          </span>
          {content.trim() ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: `${typeColor}20`,
                color: typeColor,
              }}
            >
              <TypePreviewIcon className="h-3 w-3 shrink-0" strokeWidth={2} />
              {previewLabel}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">
              입력하면 자동 분류됩니다
            </span>
          )}
        </div>

        {content.trim().length > 0 && (
          <details className="group border-t border-border/50">
            <summary
              className="flex cursor-pointer list-none items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden"
            >
              <span>세부 설정</span>
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
              />
            </summary>
            <CardContent className="border-t border-border/50 pt-3">
              {willStripDate && (
                <p className="mb-2 text-xs text-muted-foreground">
                  저장 내용:{" "}
                  <span className="font-medium text-foreground">
                    {preview.cleaned}
                  </span>
                </p>
              )}
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>타입</Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as EntryType)}
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {(["memo", "todo", "schedule", "checklist"] as EntryType[]).map(
                      (t) => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ),
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>카테고리</Label>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

            <div className="mb-3 space-y-1.5">
              <Label>일정 날짜</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
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
                  className="w-auto"
                />
                {dueAt && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDueAt(null)}
                  >
                    날짜 제거
                  </Button>
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
              <label className="mt-3 flex items-start gap-2 rounded-xl border border-primary/20 bg-accent/50 px-3 py-2.5 text-xs">
                <Checkbox
                  checked={createTravelChecklist}
                  onCheckedChange={(v) => setCreateTravelChecklist(v === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-foreground">
                    여행 준비 할일 자동 생성
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    일정 + 체크리스트 항목(비행기표, 호텔, 라면 등)을 할일로
                    만듭니다.
                  </span>
                </span>
              </label>
            )}

            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={learnKeyword}
                onCheckedChange={(v) => setLearnKeyword(v === true)}
              />
              이 분류를 기억하기 (키워드 학습)
            </label>
            </CardContent>
          </details>
        )}

        <div
          className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-2 text-xs text-muted-foreground"
        >
          <span>
            {isPending
              ? "저장 중…"
              : "Enter 저장 · Shift+Enter 줄바꿈"}
          </span>
          {content.trim() && !isPending && (
            <button
              type="submit"
              className="font-medium text-primary hover:text-primary/80"
            >
              {suggestsTravelChecklist && createTravelChecklist
                ? "여행 저장"
                : "저장"}
            </button>
          )}
        </div>
      </Card>

      {error && (
        <p className="text-sm text-destructive px-1" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
