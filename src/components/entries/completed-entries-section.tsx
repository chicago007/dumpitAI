"use client";

import type { Category, Entry, EntryType } from "@/lib/types";
import { EntryList } from "@/components/entries/entry-list";
import { CollapsibleSectionCard } from "@/components/layout/collapsible-section-card";
import { SectionCard } from "@/components/layout/page-shell";
import { ENTRY_TYPE_THEMES } from "@/lib/entry-type-theme";
import { getEntrySpace, SPACE_LABELS, type Space, type ViewSpace } from "@/lib/spaces";

const TYPE_ORDER: EntryType[] = ["todo", "schedule", "memo", "checklist"];
const SPACE_ORDER: Space[] = ["personal", "work"];

interface CompletedEntriesSectionProps {
  entries: Entry[];
  categories: Category[];
  viewSpace: ViewSpace;
  title?: string;
  emptyMessage?: string;
  contentClassName?: string;
}

function groupKey(space: Space, type: EntryType) {
  return `${space}:${type}`;
}

function buildGroups(entries: Entry[], viewSpace: ViewSpace) {
  const map = new Map<string, Entry[]>();

  for (const entry of entries) {
    const space = getEntrySpace(entry);
    const key =
      viewSpace === "all"
        ? groupKey(space, entry.type)
        : entry.type;
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }

  if (viewSpace === "all") {
    const groups: { id: string; title: string; entries: Entry[] }[] = [];
    for (const space of SPACE_ORDER) {
      for (const type of TYPE_ORDER) {
        const key = groupKey(space, type);
        const list = map.get(key);
        if (!list?.length) continue;
        groups.push({
          id: key,
          title: `${SPACE_LABELS[space]} · ${ENTRY_TYPE_THEMES[type].label}`,
          entries: list,
        });
      }
    }
    return groups;
  }

  return TYPE_ORDER.filter((type) => map.has(type)).map((type) => ({
    id: type,
    title: ENTRY_TYPE_THEMES[type].label,
    entries: map.get(type) ?? [],
  }));
}

export function CompletedEntriesSection({
  entries,
  categories,
  viewSpace,
  title,
  emptyMessage = "완료한 항목이 없습니다.",
  contentClassName = "space-y-4 px-4 pb-3",
}: CompletedEntriesSectionProps) {
  if (entries.length === 0) {
    if (title) {
      return (
        <SectionCard title={title} contentClassName={contentClassName}>
          <p className="py-2 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        </SectionCard>
      );
    }
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const groups = buildGroups(entries, viewSpace);

  const body = (
    <div className="space-y-2">
      {groups.map((group) => (
        <CollapsibleSectionCard
          key={group.id}
          title={`${group.title} (${group.entries.length})`}
          contentClassName="px-3 py-0.5"
        >
          <EntryList
            entries={group.entries}
            categories={categories}
            variant="accent"
            showSpaceBadge={viewSpace === "all"}
            compactMeta={false}
          />
        </CollapsibleSectionCard>
      ))}
    </div>
  );

  if (title) {
    return (
      <SectionCard title={title} contentClassName={contentClassName}>
        {body}
      </SectionCard>
    );
  }

  return <div className={contentClassName}>{body}</div>;
}
