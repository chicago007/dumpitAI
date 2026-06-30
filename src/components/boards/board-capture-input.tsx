"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBoardClassifiedInput } from "@/actions/boards";
import { classifyBoardInput } from "@/lib/board-classify";
import type { BoardTab } from "@/lib/board-types";
import { ENTRY_TYPE_THEMES } from "@/lib/entry-type-theme";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";

const KIND_COLORS: Record<string, string> = {
  checklist: ENTRY_TYPE_THEMES.checklist.color,
  schedule: ENTRY_TYPE_THEMES.schedule.color,
  memo: ENTRY_TYPE_THEMES.memo.color,
  budget: "#eab308",
  expense: "#f97316",
};

const KIND_TO_TAB: Record<string, BoardTab> = {
  checklist: "checklist",
  schedule: "schedule",
  memo: "memo",
  budget: "budget",
  expense: "expense",
};

interface BoardCaptureInputProps {
  boardId: string;
  defaultCategoryId: string;
  defaultGroupId?: string;
  onSaved?: (tab: BoardTab) => void;
}

export function BoardCaptureInput({
  boardId,
  defaultCategoryId,
  defaultGroupId,
  onSaved,
}: BoardCaptureInputProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSpeechTranscript = useCallback((transcript: string) => {
    setContent(transcript);
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
    startListening(content);
  }

  const preview =
    content.trim().length > 0 ? classifyBoardInput(content) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    startTransition(async () => {
      const kind = await submitBoardClassifiedInput(
        boardId,
        trimmed,
        defaultCategoryId,
        defaultGroupId,
      );
      setContent("");
      router.refresh();
      onSaved?.(KIND_TO_TAB[kind] ?? "checklist");
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || e.shiftKey) return;
    e.preventDefault();
    handleSubmit(e);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
        <div className="relative">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="한 줄 입력… Enter 저장 (카테고리/항목, 자동 분류)"
            rows={2}
            className="min-h-[56px] resize-none border-0 bg-transparent px-3 py-2.5 pr-12 text-sm shadow-none focus-visible:ring-0"
          />
          {isSupported && (
            <Button
              type="button"
              variant={isListening ? "destructive" : "ghost"}
              size="icon"
              onClick={toggleVoiceInput}
              disabled={isPending}
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
        {(isListening || speechError) && (
          <p
            className="border-t border-border/50 px-3 py-1.5 text-xs text-destructive"
            role={speechError ? "alert" : undefined}
          >
            {isListening
              ? "말씀해 주세요… (마이크 버튼을 다시 누르면 중지)"
              : speechError}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2">
          <span className="text-xs text-muted-foreground shrink-0">
            분류 미리보기
          </span>
          {preview ? (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${KIND_COLORS[preview.kind]}20`,
                color: KIND_COLORS[preview.kind],
              }}
            >
              {preview.previewLabel}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">
              일정·메모·예산·지출·카테고리/항목
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Enter 저장 · Shift+Enter 줄바꿈</span>
        {content.trim() && (
          <Button
            type="submit"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            disabled={isPending}
          >
            {isPending ? "저장 중…" : "저장"}
          </Button>
        )}
      </div>
    </form>
  );
}
