"use client";

import { useState, useTransition } from "react";
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
import { previewInboxInput, saveInboxPreview } from "@/actions/inbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  CheckCircle2,
  FolderKanban,
  Loader2,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

function kindIcon(kind: InboxItemKind) {
  switch (kind) {
    case "schedule":
      return Calendar;
    case "memo":
      return StickyNote;
    case "budget":
    case "expense":
      return StickyNote;
    default:
      return CheckCircle2;
  }
}

function PreviewItemRow({
  item,
  isProjectBlock,
  onKindChange,
}: {
  item: InboxPreviewItem;
  isProjectBlock: boolean;
  onKindChange: (id: string, kind: InboxItemKind) => void;
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
            → {INBOX_KIND_LABELS[item.kind]} 탭
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
    </li>
  );
}

function PreviewPanel({
  preview,
  items,
  onKindChange,
  onConfirm,
  onCancel,
  isSaving,
}: {
  preview: InboxPreviewResult;
  items: InboxPreviewItem[];
  onKindChange: (id: string, kind: InboxItemKind) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
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

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {preview.project
              ? "프로젝트만 생성됩니다. 하위 항목을 추가해 주세요."
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
              />
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
          >
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
    <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
      <CardContent className="space-y-2 p-4">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {total > 0 ? parts.join(" · ") : "프로젝트가 생성되었습니다"}
          {boardId && classification.project
            ? ` · "${classification.project}"`
            : ""}
        </p>
      </CardContent>
    </Card>
  );
}

export function InboxInput() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<InboxPreviewResult | null>(null);
  const [items, setItems] = useState<InboxPreviewItem[]>([]);
  const [lastResult, setLastResult] = useState<InboxProcessResult | null>(null);
  const [isAnalyzing, startAnalyze] = useTransition();
  const [isSaving, startSave] = useTransition();

  const handleAnalyze = () => {
    setError(null);
    setLastResult(null);
    startAnalyze(async () => {
      try {
        const result = await previewInboxInput(text);
        setPreview(result);
        setItems(result.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
      }
    });
  };

  const handleKindChange = (id: string, kind: InboxItemKind) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, kind, tabLabel: INBOX_KIND_LABELS[kind] }
          : item,
      ),
    );
  };

  const handleConfirm = () => {
    if (!preview) return;
    setError(null);
    startSave(async () => {
      try {
        const result = await saveInboxPreview({
          ...preview,
          items,
        });
        setLastResult(result);
        setPreview(null);
        setItems([]);
        setText("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      }
    });
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setItems([]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <p className="text-sm text-muted-foreground">
              @할일 @일정 @메모 @프로젝트 · @p @t @s @m · Shift+Enter 줄 나눔
            </p>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`예:\n@프로젝트 동경여행\n8월10일 출발\n@예산 300만\n@체크리스트 여권\n\n@할일 29일까지 보고서\n@일정 오늘 회의`}
            rows={5}
            className="resize-none"
            disabled={isAnalyzing || isSaving}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (text.trim() && !preview) handleAnalyze();
              }
            }}
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {!preview && (
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !text.trim()}
              className={cn("w-full sm:w-auto")}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  분석 중…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  분석하기
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {preview && (
        <PreviewPanel
          preview={preview}
          items={items}
          onKindChange={handleKindChange}
          onConfirm={handleConfirm}
          onCancel={handleCancelPreview}
          isSaving={isSaving}
        />
      )}

      {lastResult && <SuccessSummary result={lastResult} />}
    </div>
  );
}
