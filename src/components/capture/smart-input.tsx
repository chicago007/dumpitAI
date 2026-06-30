"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  InboxItemKind,
  InboxPreviewItem,
  InboxPreviewResult,
  InboxProcessResult,
} from "@/lib/ai-inbox-types";
import {
  GLOBAL_INBOX_KINDS,
  INBOX_KIND_LABELS,
  PROJECT_INBOX_KINDS,
} from "@/lib/ai-inbox-types";
import {
  previewInboxInput,
  saveInboxPreview,
} from "@/actions/inbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  CheckCircle2,
  FolderKanban,
  Loader2,
  Mic,
  Plus,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import type { Space } from "@/lib/spaces";
import { SPACE_LABELS } from "@/lib/spaces";
import { cn } from "@/lib/utils";
import type { EntryType } from "@/lib/types";

const TYPE_PREFIX: Partial<Record<EntryType, string>> = {
  todo: "@할일 ",
  schedule: "@일정 ",
  memo: "@메모 ",
};

export interface SmartInputProps {
  compact?: boolean;
  /** 부모가 + 버튼을 제어할 때 폼만 표시 */
  forceExpanded?: boolean;
  onCollapse?: () => void;
  placeholder?: string;
  /** 목록 페이지에서 기본 접두어 힌트 */
  entryType?: EntryType;
  className?: string;
}

function kindIcon(kind: InboxItemKind) {
  switch (kind) {
    case "schedule":
      return Calendar;
    case "memo":
      return StickyNote;
    default:
      return CheckCircle2;
  }
}

function PreviewItemRow({
  item,
  isProjectBlock,
  onKindChange,
  onSpaceChange,
  showSpaceSelect,
}: {
  item: InboxPreviewItem;
  isProjectBlock: boolean;
  onKindChange: (id: string, kind: InboxItemKind) => void;
  onSpaceChange?: (id: string, space: Space) => void;
  showSpaceSelect?: boolean;
}) {
  const Icon = kindIcon(item.kind);
  const kinds = isProjectBlock ? PROJECT_INBOX_KINDS : GLOBAL_INBOX_KINDS;

  return (
    <li className="flex flex-wrap items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm">{item.content}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.dueAt && <span>날짜 {item.dueAt.slice(0, 10)}</span>}
          {item.amount != null && item.amount > 0 && (
            <span>{item.amount.toLocaleString()}원</span>
          )}
          <span className="rounded bg-background px-1.5 py-0.5">
            {SPACE_LABELS[item.targetSpace]} · {INBOX_KIND_LABELS[item.kind]}
          </span>
        </div>
      </div>
      <select
        value={item.kind}
        onChange={(e) => onKindChange(item.id, e.target.value as InboxItemKind)}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        aria-label="분류 변경"
      >
        {kinds.map((k) => (
          <option key={k} value={k}>
            {INBOX_KIND_LABELS[k]}
          </option>
        ))}
      </select>
      {showSpaceSelect && onSpaceChange && (
        <select
          value={item.targetSpace}
          onChange={(e) =>
            onSpaceChange(item.id, e.target.value as Space)
          }
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="공간 변경"
        >
          <option value="work">{SPACE_LABELS.work}</option>
          <option value="personal">{SPACE_LABELS.personal}</option>
        </select>
      )}
    </li>
  );
}

function PreviewPanel({
  preview,
  items,
  onKindChange,
  onSpaceChange,
  onSpaceChangeAll,
  onConfirm,
  onCancel,
  isSaving,
}: {
  preview: InboxPreviewResult;
  items: InboxPreviewItem[];
  onKindChange: (id: string, kind: InboxItemKind) => void;
  onSpaceChange: (id: string, space: Space) => void;
  onSpaceChangeAll: (space: Space) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const suggestedSpace = preview.suggestedSpace ?? items[0]?.targetSpace;

  return (
    <Card className="border-violet-200 bg-violet-50/30 dark:border-violet-900 dark:bg-violet-950/20">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">분류 미리보기</p>
            <p className="text-xs text-muted-foreground">
              저장 전에 분류를 확인·수정하세요
            </p>
          </div>
          {preview.project && (
            <div className="flex items-center gap-1.5 text-sm">
              <FolderKanban className="h-4 w-4 text-emerald-600" />
              <span>{preview.project}</span>
            </div>
          )}
        </div>

        {preview.needsSpaceConfirm && suggestedSpace && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              공간 추정:{" "}
              <strong>{SPACE_LABELS[suggestedSpace]}</strong> · 맞나요?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={suggestedSpace === "work" ? "default" : "outline"}
                className="h-8"
                onClick={() => onSpaceChangeAll("work")}
              >
                {SPACE_LABELS.work}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  suggestedSpace === "personal" ? "default" : "outline"
                }
                className="h-8"
                onClick={() => onSpaceChangeAll("personal")}
              >
                {SPACE_LABELS.personal}
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {preview.project
              ? "프로젝트만 생성됩니다."
              : "분류할 항목이 없습니다."}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <PreviewItemRow
                key={item.id}
                item={item}
                isProjectBlock={preview.isProjectBlock}
                onKindChange={onKindChange}
                onSpaceChange={onSpaceChange}
                showSpaceSelect={preview.needsSpaceConfirm}
              />
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onConfirm} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중…
              </>
            ) : (
              "확인 후 저장"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            다시 입력
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SuccessSummary({ result }: { result: InboxProcessResult }) {
  const { classification, created, boardId } = result;
  const total =
    created.todos +
    created.schedules +
    created.notes +
    created.checklist +
    created.budget +
    created.expense;

  const parts: string[] = [];
  if (created.todos) parts.push(`할일 ${created.todos}`);
  if (created.schedules) parts.push(`일정 ${created.schedules}`);
  if (created.notes) parts.push(`메모 ${created.notes}`);
  if (created.checklist) parts.push(`체크리스트 ${created.checklist}`);
  if (created.budget) parts.push(`예산 ${created.budget}`);
  if (created.expense) parts.push(`지출 ${created.expense}`);

  return (
    <p className="text-sm text-emerald-700 dark:text-emerald-300">
      {total > 0 ? parts.join(" · ") : "저장되었습니다"}
      {boardId && classification.project ? ` · "${classification.project}"` : ""}
    </p>
  );
}

export function SmartInput({
  compact,
  forceExpanded,
  onCollapse,
  placeholder,
  entryType,
  className,
}: SmartInputProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isOpen, setIsOpen] = useState(!compact || !!forceExpanded);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InboxPreviewResult | null>(null);
  const [items, setItems] = useState<InboxPreviewItem[]>([]);
  const [lastResult, setLastResult] = useState<InboxProcessResult | null>(null);
  const [isBusy, startTransition] = useTransition();

  const onSpeechTranscript = useCallback((transcript: string) => {
    setText(transcript);
    setError(null);
  }, []);

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
    startListening(text);
  }

  const isMultiLine = text.includes("\n");
  const prefixHint = entryType ? TYPE_PREFIX[entryType] : "";
  const defaultPlaceholder = compact
    ? `${prefixHint}입력… Enter 저장 · Shift+Enter 줄 나눔`
    : `${prefixHint}한 줄은 Enter로 바로 저장\n여러 줄은 분석 후 저장 · 공간은 AI가 추정`;

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  function collapseIfEmpty() {
    if (compact && !text.trim() && !preview) {
      setIsOpen(false);
      setError(null);
      onCollapse?.();
    }
  }

  function afterSave(result: InboxProcessResult) {
    setLastResult(result);
    setPreview(null);
    setItems([]);
    setText("");
    if (compact) {
      setIsOpen(false);
      onCollapse?.();
    }
    router.refresh();
    window.setTimeout(() => setLastResult(null), 4000);
  }

  function handleAnalyze() {
    if (!text.trim() || preview) return;
    setError(null);
    setLastResult(null);
    startTransition(async () => {
      try {
        const result = await previewInboxInput(text);
        setPreview(result);
        setItems(result.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
      }
    });
  }

  function handleQuickSave() {
    if (!text.trim() || preview || isBusy) return;
    setError(null);
    setLastResult(null);
    startTransition(async () => {
      try {
        const result = await previewInboxInput(text);
        if (result.needsSpaceConfirm || isMultiLine) {
          setPreview(result);
          setItems(result.items);
          return;
        }
        const saved = await saveInboxPreview({ ...result, items: result.items });
        afterSave(saved);
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      }
    });
  }

  function handleConfirm() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveInboxPreview({ ...preview, items });
        afterSave(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAnalyze();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !isMultiLine) {
      e.preventDefault();
      handleQuickSave();
    }
  }

  if (compact && !forceExpanded && !isOpen && !preview) {
    return (
      <div className={className}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-border/60 shadow-sm"
          onClick={() => setIsOpen(true)}
          aria-label="새 항목 추가"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const formBlock = (
    <div className={cn("space-y-3", compact ? "w-full" : className)}>
      <Card className="overflow-hidden border-border/60 shadow-card">
        <CardContent className={cn("space-y-3", compact ? "p-3" : "p-4")}>
          {compact && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => {
                  setIsOpen(false);
                  setPreview(null);
                  setItems([]);
                  setText("");
                  setError(null);
                  onCollapse?.();
                }}
                aria-label="입력 닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {!compact && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <p className="text-xs text-muted-foreground sm:text-sm">
                AI 자동 분류 · @할일 @일정 @메모 · @p 프로젝트
              </p>
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder={placeholder ?? defaultPlaceholder}
              rows={compact ? 2 : 4}
              className="resize-none pr-12"
              disabled={isBusy}
              onKeyDown={handleKeyDown}
            />
            {isSupported && (
              <Button
                type="button"
                variant={isListening ? "destructive" : "ghost"}
                size="icon"
                onClick={toggleVoiceInput}
                disabled={isBusy}
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
            <p className="text-xs text-destructive">
              말씀해 주세요… (마이크 버튼을 다시 누르면 중지)
            </p>
          )}
          {speechError && (
            <p className="text-xs text-destructive" role="alert">
              {speechError}
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {lastResult && <SuccessSummary result={lastResult} />}

          {!preview && (
            <div className="flex flex-wrap items-center gap-2">
              {isMultiLine && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={isBusy || !text.trim()}
                >
                  {isBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  분석하기
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {isMultiLine
                  ? "Cmd+Enter 분석 · Shift+Enter 줄 나눔"
                  : "Enter 저장 · Shift+Enter 줄 나눔"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <PreviewPanel
          preview={preview}
          items={items}
          onKindChange={(id, kind) =>
            setItems((prev) =>
              prev.map((item) =>
                item.id === id
                  ? { ...item, kind, tabLabel: INBOX_KIND_LABELS[kind] }
                  : item,
              ),
            )
          }
          onSpaceChange={(id, space) =>
            setItems((prev) =>
              prev.map((item) =>
                item.id === id ? { ...item, targetSpace: space } : item,
              ),
            )
          }
          onSpaceChangeAll={(space) => {
            setItems((prev) =>
              prev.map((item) => ({ ...item, targetSpace: space })),
            );
            setPreview((p) => (p ? { ...p, suggestedSpace: space } : p));
          }}
          onConfirm={handleConfirm}
          onCancel={() => {
            setPreview(null);
            setItems([]);
            collapseIfEmpty();
          }}
          isSaving={isBusy}
        />
      )}
    </div>
  );

  return formBlock;
}
