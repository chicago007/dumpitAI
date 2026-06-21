"use client";

import { useMemo, useState, useTransition } from "react";
import type { Category, Entry } from "@/lib/types";
import {
  TRAVEL_CHECKLIST_COLUMNS,
  countTemplateItems,
  findTemplateItemByLabel,
  getTravelChecklistId,
  type TravelChecklistGroup,
  type TravelChecklistItem,
} from "@/lib/travel-checklist-template";
import { createEntry, toggleEntryDone, assignEntryCategory } from "@/actions/entries";

interface TravelChecklistTableProps {
  category: Category;
  entries: Entry[];
  template: TravelChecklistGroup[];
}

function findEntryForItem(
  item: TravelChecklistItem,
  entries: Entry[],
  template: TravelChecklistGroup[],
) {
  const byId = entries.find(
    (entry) => getTravelChecklistId(entry.metadata ?? {}) === item.id,
  );
  if (byId) return byId;

  return entries.find((entry) => {
    if (entry.content.trim() === item.label) return true;
    const match = findTemplateItemByLabel(entry.content, template);
    return match?.item.id === item.id;
  });
}

function ChecklistCell({
  item,
  entry,
  disabled,
  onToggle,
}: {
  item: TravelChecklistItem;
  entry: Entry | undefined;
  disabled: boolean;
  onToggle: (item: TravelChecklistItem, checked: boolean) => void;
}) {
  const isDone = entry?.status === "done";
  const isExcluded = item.excluded && !entry;

  return (
    <td className="border border-slate-200 p-1 align-top">
      <label
        className={`flex min-h-[2rem] items-start gap-1.5 rounded px-1 py-0.5 text-xs leading-snug ${
          isExcluded
            ? "text-slate-400"
            : isDone
              ? "text-slate-500"
              : "text-slate-800"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50"}`}
      >
        <input
          type="checkbox"
          checked={isDone}
          disabled={disabled || isExcluded}
          onChange={(e) => onToggle(item, e.target.checked)}
          className="mt-0.5 shrink-0 rounded border-slate-300"
        />
        <span className={isDone ? "line-through" : ""}>
          {item.label}
          {isExcluded && !isDone ? " X" : ""}
        </span>
      </label>
    </td>
  );
}

export function TravelChecklistTable({
  category,
  entries,
  template,
}: TravelChecklistTableProps) {
  const categoryId = category.id;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const { actionable } = countTemplateItems(template);
    let done = 0;
    for (const group of template) {
      for (const row of group.rows) {
        for (const item of row) {
          if (item.excluded) continue;
          const entry = findEntryForItem(item, entries, template);
          if (entry?.status === "done") done += 1;
        }
      }
    }
    return { done, actionable };
  }, [entries, template]);

  function handleToggle(item: TravelChecklistItem, checked: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const existing = findEntryForItem(item, entries, template);
        if (existing) {
          if (
            existing.category_id !== categoryId &&
            existing.type === "checklist"
          ) {
            await assignEntryCategory(existing.id, categoryId);
          }
          await toggleEntryDone(existing.id, checked);
          return;
        }
        if (checked) {
          await createEntry({
            content: item.label,
            type: "todo",
            categoryId,
            metadata: {
              travelChecklistId: item.id,
              travelChecklistGroup: template.find((g) =>
                g.rows.some((r) => r.some((i) => i.id === item.id)),
              )?.name,
              fromTravelChecklist: true,
            },
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "체크리스트 저장에 실패했습니다.",
        );
      }
    });
  }

  return (
    <div className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">
            <span
              className="mr-1.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${category.color}18`,
                color: category.color,
              }}
            >
              {category.name}
            </span>
            완료 {stats.done}/{stats.actionable} · X 표시는 이번 여행에 불필요한 항목
          </p>
        </div>
        {isPending && (
          <span className="text-xs text-slate-400">저장 중…</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <tbody>
            {template.map((group) =>
              group.rows.map((row, rowIndex) => (
                <tr key={`${group.name}-${rowIndex}`} className="bg-white">
                  {rowIndex === 0 && (
                    <th
                      rowSpan={group.rows.length}
                      className="w-20 border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700 align-top"
                    >
                      {group.name}
                    </th>
                  )}
                  {Array.from({ length: TRAVEL_CHECKLIST_COLUMNS }).map((_, colIndex) => {
                    const item = row[colIndex];
                    if (!item) {
                      return (
                        <td
                          key={colIndex}
                          className="border border-slate-200 bg-slate-50/30"
                        />
                      );
                    }
                    return (
                      <ChecklistCell
                        key={item.id}
                        item={item}
                        entry={findEntryForItem(item, entries, template)}
                        disabled={isPending}
                        onToggle={handleToggle}
                      />
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}
