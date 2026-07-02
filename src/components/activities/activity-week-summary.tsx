import type { ActivityWeekStat } from "@/actions/activities";
import {
  getActivityDefinition,
  type ActivityTypeDefinition,
} from "@/lib/activity-catalog";

function formatStat(stat: ActivityWeekStat) {
  const parts: string[] = [`${stat.count}회`];
  if (stat.totalDurationMin > 0) {
    parts.push(`${stat.totalDurationMin}분`);
  }
  if (stat.totalQuantity > 0 && stat.unit === "km") {
    parts.push(`${stat.totalQuantity}km`);
  }
  if (stat.totalQuantity > 0 && stat.unit === "page") {
    parts.push(`${stat.totalQuantity}페이지`);
  }
  return parts.join(" · ");
}

export function ActivityWeekSummary({
  stats,
  catalog,
}: {
  stats: ActivityWeekStat[];
  catalog: ActivityTypeDefinition[];
}) {
  const ordered = catalog
    .map((type) => {
      const stat = stats.find((s) => s.activityKey === type.key);
      return stat ? { type, stat } : null;
    })
    .filter((item): item is { type: ActivityTypeDefinition; stat: ActivityWeekStat } =>
      item !== null,
    );

  const extraStats = stats.filter(
    (stat) => !catalog.some((type) => type.key === stat.activityKey),
  );

  const items = [
    ...ordered,
    ...extraStats.map((stat) => ({
      type: {
        key: stat.activityKey,
        label: stat.activityKey,
        color: "#6B7280",
        builtin: false,
      },
      stat,
    })),
  ];

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
        이번 주 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(({ type, stat }) => {
        const definition = getActivityDefinition(catalog, type.key);
        return (
          <div
            key={type.key}
            className="rounded-xl border border-border/60 bg-card px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: definition.color }}
              />
              <span className="text-sm font-semibold text-foreground">
                {definition.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatStat(stat)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
