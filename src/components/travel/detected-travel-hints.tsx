"use client";

import { useState, useTransition } from "react";
import type { Entry } from "@/lib/types";
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
      <h2 className="text-sm font-semibold text-slate-700">
        여행 메모를 발견했어요
      </h2>
      <p className="text-xs text-slate-500">
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
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-amber-900">메모에서 감지</p>
          <h3 className="mt-1 font-semibold text-slate-800">{entry.content}</h3>
          <p className="mt-1 text-xs text-slate-600">
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
          <p className="mb-1.5 text-xs font-semibold text-amber-800">
            아직 준비 안 한 것 ({pendingCount})
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            {pendingItems.slice(0, 6).map(({ item }) => (
              <li key={item.id}>· {item.label}</li>
            ))}
          </ul>
          {pendingCount > 6 && (
            <p className="mt-1 text-xs text-slate-500">
              + {pendingCount - 6}개 더
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>
      )}

      <button
        type="button"
        onClick={handleCreatePlan}
        disabled={isPending}
        className="mt-4 w-full rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {isPending ? "생성 중…" : "할일 만들고 준비 시작"}
      </button>
    </div>
  );
}
