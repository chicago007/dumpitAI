"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { Entry } from "@/lib/types";
import type { TravelChecklistGroup } from "@/lib/travel-checklist-template";
import { Checkbox } from "@/components/ui/checkbox";
import {
  buildTravelPlanStatus,
  formatDepartureLabel,
  getTravelPlanId,
  seasonLabel,
  type TravelSeason,
} from "@/lib/travel-plan";
import { toggleEntryDone } from "@/actions/entries";
import { PROJECT_LABEL } from "@/lib/project-labels";

interface ActiveTravelPlansProps {
  plans: Entry[];
  prepEntries: Entry[];
  template?: TravelChecklistGroup[];
}

export function ActiveTravelPlans({
  plans,
  prepEntries,
  template,
}: ActiveTravelPlansProps) {
  if (plans.length === 0) return null;

  return (
    <section className="mb-8 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">여행 준비 중</h2>
      {plans.map((plan) => (
        <TravelPlanCard
          key={plan.id}
          plan={plan}
          prepEntries={prepEntries}
          template={template}
        />
      ))}
    </section>
  );
}

function TravelPlanCard({
  plan,
  prepEntries,
  template,
}: {
  plan: Entry;
  prepEntries: Entry[];
  template?: TravelChecklistGroup[];
}) {
  const planId = getTravelPlanId(plan.metadata ?? {});
  const destination =
    typeof plan.metadata?.destination === "string"
      ? plan.metadata.destination
      : "";
  const season =
    typeof plan.metadata?.season === "string" ? plan.metadata.season : "";

  const relatedPrep = planId
    ? prepEntries.filter(
        (e) => getTravelPlanId(e.metadata ?? {}) === planId,
      )
    : prepEntries.filter((e) => {
        const dest = e.metadata?.destination;
        return typeof dest === "string" && dest === destination;
      });

  const [isPending, startTransition] = useTransition();

  const status = buildTravelPlanStatus(
    plan.content,
    relatedPrep,
    destination,
    plan.due_at ? new Date(plan.due_at) : null,
    template,
  );

  if (!status) return null;

  function handleToggle(entryId: string, done: boolean) {
    startTransition(async () => {
      await toggleEntryDone(entryId, done);
    });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">{plan.content}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.due_at && formatDepartureLabel(new Date(plan.due_at))}
            {season && ` · ${seasonLabel(season as TravelSeason)}`}
            {" · "}준비 {status.preparedCount}/{status.preparedCount + status.pendingCount}
          </p>
        </div>
        <Link
          href="/boards"
          className="text-xs font-medium text-primary hover:underline"
        >
          {PROJECT_LABEL}에서 보기
        </Link>
      </div>

      {status.pendingCount > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            아직 준비 안 한 것 ({status.pendingCount})
          </p>
          <ul className="space-y-1.5">
            {status.pendingItems.slice(0, 8).map(({ item, entryId }) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  size="sm"
                  checked={false}
                  disabled={isPending || !entryId}
                  onCheckedChange={() => entryId && handleToggle(entryId, true)}
                  aria-label={item.label}
                />
                <span className="text-foreground">{item.label}</span>
              </li>
            ))}
          </ul>
          {status.pendingCount > 8 && (
            <p className="mt-2 text-xs text-muted-foreground">
              + {status.pendingCount - 8}개 더…
            </p>
          )}
        </div>
      )}

      {status.pendingCount === 0 && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          모든 준비가 완료되었습니다!
        </p>
      )}
    </div>
  );
}
