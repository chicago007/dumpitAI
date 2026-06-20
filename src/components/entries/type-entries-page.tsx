import { EntryList } from "@/components/entries/entry-list";
import { SetupNotice } from "@/components/setup/setup-notice";
import { TYPE_LABELS } from "@/lib/classify";
import { loadCategories, loadEntries } from "@/lib/app-data";
import type { Entry, EntryType } from "@/lib/types";

export const TYPE_PATHS: Record<EntryType, string> = {
  memo: "/memo",
  todo: "/todo",
  schedule: "/schedule",
  checklist: "/checklist",
};

/** 일정: 가까운 날짜(다가오는 일정)부터, 날짜 없는 항목은 뒤로 */
function sortSchedulesByDueDate(entries: Entry[]) {
  return [...entries].sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return a.due_at.localeCompare(b.due_at);
  });
}

export async function TypeEntriesPage({ type }: { type: EntryType }) {
  const label = TYPE_LABELS[type];

  const categoriesResult = await loadCategories();
  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const entriesResult = await loadEntries({ status: "active", type });
  if (!entriesResult.ok) {
    return <SetupNotice />;
  }

  const entries =
    type === "schedule"
      ? sortSchedulesByDueDate(entriesResult.data)
      : entriesResult.data;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-slate-800">{label}</h1>
      <p className="mb-6 text-sm text-slate-500">활성 {entries.length}건</p>
      <div className="rounded-xl border border-slate-200 bg-white px-4">
        <EntryList
          entries={entries}
          categories={categoriesResult.data}
          hideType
        />
      </div>
    </main>
  );
}
