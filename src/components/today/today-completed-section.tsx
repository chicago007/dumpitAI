import type { Category, Entry } from "@/lib/types";
import { CompletedEntriesSection } from "@/components/entries/completed-entries-section";
import type { ViewSpace } from "@/lib/spaces";

interface TodayCompletedSectionProps {
  entries: Entry[];
  categories: Category[];
  viewSpace: ViewSpace;
}

export function TodayCompletedSection({
  entries,
  categories,
  viewSpace,
}: TodayCompletedSectionProps) {
  if (entries.length === 0) return null;

  return (
    <CompletedEntriesSection
      entries={entries}
      categories={categories}
      viewSpace={viewSpace}
      title={`오늘 완료 (${entries.length})`}
    />
  );
}
