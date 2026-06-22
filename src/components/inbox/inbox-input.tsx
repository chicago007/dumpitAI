"use client";

import { useState, useTransition } from "react";
import type { AiInboxClassification, InboxProcessResult } from "@/lib/ai-inbox-types";
import { processInboxInput } from "@/actions/inbox";
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

function ResultPreview({ result }: { result: AiInboxClassification }) {
  const hasContent =
    result.project ||
    result.todos.length > 0 ||
    result.schedules.length > 0 ||
    result.notes.length > 0;

  if (!hasContent) {
    return (
      <p className="text-sm text-muted-foreground">
        분류할 항목이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {result.project && (
        <div className="flex items-start gap-2">
          <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">프로젝트</p>
            <p className="text-sm">{result.project}</p>
          </div>
        </div>
      )}
      {result.todos.length > 0 && (
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">할일</p>
            <ul className="text-sm">
              {result.todos.map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {result.schedules.length > 0 && (
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">일정</p>
            <ul className="text-sm">
              {result.schedules.map((s) => (
                <li key={s.title}>
                  · {s.title}
                  {s.start_date && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({s.start_date.slice(0, 16).replace("T", " ")})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {result.notes.length > 0 && (
        <div className="flex items-start gap-2">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">메모</p>
            <ul className="text-sm">
              {result.notes.map((n) => (
                <li key={n}>· {n}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessSummary({ result }: { result: InboxProcessResult }) {
  const { classification, created, boardId } = result;
  const total = created.todos + created.schedules + created.notes;

  return (
    <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {total}개 항목이 생성되었습니다
          {boardId && classification.project
            ? ` · 프로젝트 "${classification.project}"`
            : ""}
        </p>
        <ResultPreview result={classification} />
      </CardContent>
    </Card>
  );
}

export function InboxInput() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<InboxProcessResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    setLastResult(null);
    startTransition(async () => {
      try {
        const result = await processInboxInput(text);
        setLastResult(result);
        setText("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <p className="text-sm text-muted-foreground">
              무엇이든 입력하세요. AI가 프로젝트·할일·일정·메모로 분류합니다.
            </p>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="예: 다음주 부산 출장인데 KTX 예약해야 함"
            rows={4}
            className="resize-none"
            disabled={isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (text.trim()) handleSubmit();
              }
            }}
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !text.trim()}
            className={cn("w-full sm:w-auto")}
          >
            {isPending ? (
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
        </CardContent>
      </Card>

      {lastResult && <SuccessSummary result={lastResult} />}
    </div>
  );
}
