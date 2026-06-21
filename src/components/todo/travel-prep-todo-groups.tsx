"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Category, Entry } from "@/lib/types";
import type { TravelPrepTodoGroup } from "@/lib/travel-plan";
import { EntryList } from "@/components/entries/entry-list";
import { formatDepartureLabel } from "@/lib/travel-plan";
import { cn } from "@/lib/utils";

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
    <section className="rounded-xl border border-border/60 bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/40"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            !open && "-rotate-90",
          )}
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-foreground">
            {group.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {dueLabel && `${dueLabel} · `}
            완료 {doneCount}/{total}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-primary">
          {open ? "숨기기" : "펼치기"}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/50 px-4 pb-2">
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
