import type { Category, Entry } from "@/lib/types";
import { EntryItem } from "@/components/entries/entry-item";
import {
  formatCurrency,
  groupEntriesByDestination,
  sumTravelAmount,
} from "@/lib/travel";

interface TravelCategoryViewProps {
  entries: Entry[];
  categories: Category[];
}

export function TravelCategoryView({
  entries,
  categories,
}: TravelCategoryViewProps) {
  const groups = groupEntriesByDestination(entries);
  const grandTotal = sumTravelAmount(entries);

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        항목이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.destination}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              {group.destination}
            </h2>
            <p className="text-xs text-slate-500">
              {group.entries.length}건
              {group.totalAmount > 0 && ` · ${formatCurrency(group.totalAmount)}`}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4">
            <ul className="divide-y divide-slate-100">
              {group.entries.map((entry) => (
                <EntryItem
                  key={entry.id}
                  entry={entry}
                  categories={categories}
                />
              ))}
            </ul>
          </div>
        </section>
      ))}

      {grandTotal > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-800">
            총 비용 {formatCurrency(grandTotal)}
          </p>
        </div>
      )}
    </div>
  );
}
