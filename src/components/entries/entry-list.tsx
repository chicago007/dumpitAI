import type { Category, Entry, EntryType } from "@/lib/types";
import { EntryItem } from "@/components/entries/entry-item";
import { EntryListEmpty } from "@/components/entries/entry-list-empty";
import { cn } from "@/lib/utils";

interface EntryListEmptyState {
  message: string;
  entryType: EntryType;
  actionLabel?: string;
  actionHref?: string;
  focusCapture?: boolean;
  compact?: boolean;
}

interface EntryListProps {
  entries: Entry[];
  categories: Category[];
  showCheckbox?: boolean;
  hideType?: boolean;
  showTypeBadge?: boolean;
  showSpaceBadge?: boolean;
  variant?: "plain" | "cards" | "accent";
  emptyState?: EntryListEmptyState;
  emptyMessage?: string;
  compactMeta?: boolean;
}

export function EntryList({
  entries,
  categories,
  showCheckbox = true,
  hideType = false,
  showTypeBadge = false,
  showSpaceBadge = false,
  variant = "plain",
  emptyState,
  emptyMessage = "항목이 없습니다.",
  compactMeta,
}: EntryListProps) {
  if (entries.length === 0) {
    if (emptyState) {
      return <EntryListEmpty {...emptyState} />;
    }
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const cardRow = variant === "cards";
  const accentRow = variant === "accent";

  return (
    <ul
      className={cn(
        accentRow
          ? "flex flex-col gap-0.5"
          : cardRow
            ? "flex flex-col gap-1"
            : "divide-y divide-border/50",
      )}
    >
      {entries.map((entry) => (
        <EntryItem
          key={entry.id}
          entry={entry}
          categories={categories}
          showCheckbox={showCheckbox}
          hideType={hideType}
          showTypeBadge={showTypeBadge}
          showSpaceBadge={showSpaceBadge}
          cardRow={cardRow}
          accentRow={accentRow}
          compactMeta={compactMeta ?? accentRow}
        />
      ))}
    </ul>
  );
}
