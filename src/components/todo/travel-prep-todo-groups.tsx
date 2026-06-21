"use client";

import { useState } from "react";
import type { Category, Entry } from "@/lib/types";
import type { TravelPrepTodoGroup } from "@/lib/travel-plan";
import { EntryList } from "@/components/entries/entry-list";
import { formatDepartureLabel } from "@/lib/travel-plan";

interface TravelPrepTodoGroupsProps {
  groups: TravelPrepTodoGroup[];
  categories: Category[];
}

function TravelPrepGroupCard({
  group,
  categories,
  defaultOpen = true,
}: {
  group: TravelPrepTodoGroup;
  categories: Category[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const doneCount = group.entries.filter((e) => e.status === "done").length;
  const total = group.entries.length;
  const dueLabel = group.dueAt
    ? formatDepartureLabel(new Date(group.dueAt))
    : null;

  return (
    <section className="rounded-xl border border-sky-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sky-50/50"
        aria-expanded={open}
      >
        <span
          className="shrink-0 text-slate-400 transition-transform"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          ▾
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-800">{group.title}</h2>
          <p className="text-xs text-slate-500">
            {dueLabel && `${dueLabel} · `}
            완료 {doneCount}/{total}
          </p>
        </div>
        <span className="shrink-0 text-xs text-sky-700">
          {open ? "숨기기" : "펼치기"}
        </span>
      </button>

      {open && (
        <div className="border-t border-sky-100 px-4 pb-1">
          <EntryList
            entries={group.entries}
            categories={categories}
            hideType
          />
        </div>
      )}
    </section>
  );
}

export function TravelPrepTodoGroups({
  groups,
  categories,
}: TravelPrepTodoGroupsProps) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <TravelPrepGroupCard
          key={group.id}
          group={group}
          categories={categories}
        />
      ))}
    </div>
  );
}
