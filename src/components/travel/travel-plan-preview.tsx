"use client";

import type { Entry } from "@/lib/types";
import type { TravelChecklistGroup } from "@/lib/travel-checklist-template";
import {
  buildTravelPlanStatus,
  formatDepartureLabel,
  seasonLabel,
  type TravelPlanStatus,
} from "@/lib/travel-plan";

interface TravelPlanPreviewProps {
  content: string;
  destination: string;
  departureDate: Date | null;
  prepEntries: Entry[];
  template?: TravelChecklistGroup[];
}

function StatusSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: TravelPlanStatus["items"];
  tone: "pending" | "skipped" | "done";
}) {
  if (items.length === 0) return null;

  const toneClass =
    tone === "pending"
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : tone === "skipped"
        ? "text-slate-500 bg-slate-50 border-slate-200"
        : "text-emerald-800 bg-emerald-50 border-emerald-200";

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-semibold text-slate-600">{title}</p>
      <ul className="space-y-1">
        {items.map(({ item, reason }) => (
          <li
            key={item.id}
            className={`flex flex-wrap items-center gap-x-2 rounded-md border px-2 py-1 text-xs ${toneClass}`}
          >
            <span>{item.label}</span>
            {reason && (
              <span className="text-[11px] opacity-75">({reason})</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TravelPlanPreview({
  content,
  destination,
  departureDate,
  prepEntries,
  template,
}: TravelPlanPreviewProps) {
  const status = buildTravelPlanStatus(
    content,
    prepEntries,
    destination,
    departureDate,
    template,
  );

  if (!status) return null;

  const { context, pendingItems, preparedCount, pendingCount, skippedCount } =
    status;
  const doneItems = status.items.filter((i) => i.status === "done");
  const skippedItems = status.items.filter((i) => i.status === "skipped");

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-sky-900">
          ✈️ 여행 준비 제안
        </span>
        {context.departureDate && (
          <span className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-600">
            {formatDepartureLabel(context.departureDate)}
          </span>
        )}
        <span className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-600">
          {context.destination}
        </span>
        <span className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-600">
          {seasonLabel(context.season)}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-600">
        준비 완료 {preparedCount} · 미준비 {pendingCount}
        {skippedCount > 0 && ` · 제외 ${skippedCount}`}
      </p>

      {pendingCount > 0 && (
        <StatusSection
          title="아직 준비 안 한 것"
          items={pendingItems}
          tone="pending"
        />
      )}

      {doneItems.length > 0 && (
        <StatusSection title="준비 완료" items={doneItems} tone="done" />
      )}

      {skippedItems.length > 0 && (
        <StatusSection
          title="이번 여행엔 안 가져가면 돼요"
          items={skippedItems}
          tone="skipped"
        />
      )}

      <p className="mt-3 text-[11px] text-slate-500">
        저장하면 일정과 할일(비행기표, 호텔 등)이 자동 생성됩니다. 계절·지역에
        맞지 않는 항목은 빼줍니다.
      </p>
    </div>
  );
}
