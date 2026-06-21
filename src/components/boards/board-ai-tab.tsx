"use client";

import { useState } from "react";
import type { Board } from "@/lib/types";
import { formatBoardDateRange } from "@/lib/board-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SAMPLE_QUESTIONS = [
  "USJ 익스프레스 패스 필요해?",
  "도톤보리 근처 맛집 추천",
  "간사이 패스 살까?",
];

interface BoardAiTabProps {
  board: Board;
}

export function BoardAiTab({ board }: BoardAiTabProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const dateRange = formatBoardDateRange(board.start_date, board.end_date);
  const budget = board.budget_total
    ? `${(board.budget_total / 10000).toFixed(0)}만원`
    : null;

  function handleAsk(q: string) {
    setQuestion(q);
    setAnswer(
      "AI 연동 준비 중입니다. 곧 여행·업무 맥락에 맞는 답변을 제공할 예정입니다.",
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <p className="text-sm font-semibold text-foreground">AI 여행 도우미</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {board.name}
          {dateRange ? ` · ${dateRange}` : ""}
          {budget ? ` · 예산 ${budget}` : ""}
        </p>
      </div>

      <div className="space-y-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="질문하기"
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && question.trim()) handleAsk(question.trim());
          }}
        />
        <Button
          type="button"
          size="sm"
          disabled={!question.trim()}
          onClick={() => handleAsk(question.trim())}
        >
          질문하기
        </Button>
      </div>

      {answer && (
        <p className="rounded-lg border border-border/50 bg-card p-3 text-sm text-muted-foreground">
          {answer}
        </p>
      )}

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">예시 질문</p>
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            className="block w-full text-left text-sm text-primary hover:underline"
            onClick={() => handleAsk(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
