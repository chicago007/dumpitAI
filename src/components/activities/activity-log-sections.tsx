"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteActivityLog } from "@/actions/activities";
import { formatActivitySummary } from "@/lib/activity-input";
import {
  getActivityDefinition,
  type ActivityTypeDefinition,
} from "@/lib/activity-catalog";
import { resolveActivityKey, type ActivityLog } from "@/lib/activity-types";
import { getSeoulDateKeyFromIso } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { CollapsibleSectionCard } from "@/components/layout/collapsible-section-card";

function formatLoggedLabel(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function groupByDay(logs: ActivityLog[]) {
  const map = new Map<string, ActivityLog[]>();
  for (const log of logs) {
    const key = getSeoulDateKeyFromIso(log.logged_at);
    const list = map.get(key) ?? [];
    list.push(log);
    map.set(key, list);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function ActivityLogRow({
  log,
  definition,
}: {
  log: ActivityLog;
  definition: ActivityTypeDefinition;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("이 활동 기록을 삭제할까요?")) return;
    startTransition(async () => {
      await deleteActivityLog(log.id);
      router.refresh();
    });
  }

  return (
    <div
      className="flex h-10 items-center gap-2 border-l-[3px] bg-muted/20 px-3"
      style={{ borderLeftColor: definition.color }}
    >
      <p className="min-w-0 flex-1 truncate text-sm text-foreground">
        {formatActivitySummary(log, definition.label)}
      </p>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatLoggedLabel(log.logged_at)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isPending}
        aria-label="삭제"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ActivityLogSections({
  logs,
  catalog,
}: {
  logs: ActivityLog[];
  catalog: ActivityTypeDefinition[];
}) {
  const orphanLogs = logs.filter(
    (log) => !catalog.some((t) => t.key === resolveActivityKey(log)),
  );

  const sections: ActivityTypeDefinition[] = [
    ...catalog.filter((type) =>
      logs.some((log) => resolveActivityKey(log) === type.key),
    ),
    ...(orphanLogs.length > 0
      ? [
          {
            key: "__orphan__",
            label: "기타",
            color: "#6B7280",
            builtin: false,
          },
        ]
      : []),
  ];

  if (sections.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        아직 기록이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((type) => {
        const typeLogs =
          type.key === "__orphan__"
            ? orphanLogs
            : logs.filter((log) => resolveActivityKey(log) === type.key);
        const grouped = groupByDay(typeLogs);
        const definition =
          type.key === "__orphan__"
            ? type
            : getActivityDefinition(catalog, type.key);

        return (
          <CollapsibleSectionCard
            key={type.key}
            title={`${definition.label} (${typeLogs.length})`}
            contentClassName="px-3 py-1 space-y-2"
          >
            {typeLogs.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                기록이 없습니다.
              </p>
            ) : (
              grouped.map(([dayKey, dayLogs]) => (
                <div key={dayKey}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {formatLoggedLabel(dayLogs[0].logged_at)}
                  </p>
                  <div className="space-y-0.5">
                    {dayLogs.map((log) => (
                      <ActivityLogRow
                        key={log.id}
                        log={log}
                        definition={
                          type.key === "__orphan__"
                            ? {
                                key: resolveActivityKey(log),
                                label: resolveActivityKey(log),
                                color: "#6B7280",
                                builtin: false,
                              }
                            : definition
                        }
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </CollapsibleSectionCard>
        );
      })}
    </div>
  );
}
