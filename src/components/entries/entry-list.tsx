import type { Category, Entry } from "@/lib/types";
import { EntryItem } from "@/components/entries/entry-item";

interface EntryListProps {
  entries: Entry[];
  categories: Category[];
  showCheckbox?: boolean;
  hideType?: boolean;
}

export function EntryList({
  entries,
  categories,
  showCheckbox = true,
  hideType = false,
}: EntryListProps) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        항목이 없습니다.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((entry) => (
        <EntryItem
          key={entry.id}
          entry={entry}
          categories={categories}
          showCheckbox={showCheckbox}
          hideType={hideType}
        />
      ))}
    </ul>
  );
}
