"use client";

import { useState, useTransition } from "react";
import type { Entry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  type DetectedTravelEntry,
  formatDepartureLabel,
  seasonLabel,
} from "@/lib/travel-plan";
import { createTravelPlanFromEntry } from "@/actions/travel-plan";

interface DetectedTravelHintsProps {
  hints: DetectedTravelEntry[];
  travelCategoryId: string;
}

export function DetectedTravelHints({
  hints,
  travelCategoryId,
}: DetectedTravelHintsProps) {
  if (hints.length === 0) return null;

  return (
    <section className="mb-8 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">
        여행 메모를 발견했어요
      </h2>
      <p className="text-xs text-muted-foreground">
        저장한 메모에서 여행 일정을 찾았습니다. 체크리스트를 만들어 준비
        상태를 확인하세요.
      </p>
      {hints.map((hint) => (
        <DetectedTravelHintCard
          key={hint.entry.id}
          hint={hint}
          travelCategoryId={travelCategoryId}
        />
      ))}
    </section>
  );
}

function DetectedTravelHintCard({
  hint,
  travelCategoryId,
}: {
  hint: DetectedTravelEntry;
  travelCategoryId: string;
}) {
  const { entry, status } = hint;
  const { context, pendingCount, pendingItems, preparedCount } = status;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreatePlan() {
    setError(null);
    startTransition(async () => {
      try {
        await createTravelPlanFromEntry(entry.id, travelCategoryId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "체크리스트 생성에 실패했습니다.",
        );
      }
    });
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            메모에서 감지
          </p>
          <h3 className="mt-1 font-semibold text-foreground">
            {entry.content}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {context.departureDate &&
              formatDepartureLabel(context.departureDate)}
            {context.departureDate && " · "}
            {context.destination}
            {" · "}
            {seasonLabel(context.season)}
            {" · "}
            준비 {preparedCount}/{preparedCount + pendingCount}
          </p>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            아직 준비 안 한 것 ({pendingCount})
          </p>
          <ul className="space-y-1 text-sm text-foreground">
            {pendingItems.slice(0, 6).map(({ item }) => (
              <li key={item.id}>· {item.label}</li>
            ))}
          </ul>
          {pendingCount > 6 && (
            <p className="mt-1 text-xs text-muted-foreground">
              + {pendingCount - 6}개 더
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>
      )}

      <Button
        type="button"
        onClick={handleCreatePlan}
        disabled={isPending}
        className="mt-4 w-full"
      >
        {isPending ? "생성 중…" : "할일 만들고 준비 시작"}
      </Button>
    </div>
  );
}
