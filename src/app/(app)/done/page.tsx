import { EntryList } from "@/components/entries/entry-list";
import { SetupNotice } from "@/components/setup/setup-notice";
import { getDoneStats } from "@/actions/entries";
import { isSchemaSetupError } from "@/lib/supabase/errors";
import { loadCategories, loadEntries } from "@/lib/app-data";

export default async function DonePage() {
  const categoriesResult = await loadCategories();
  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const doneResult = await loadEntries({ status: "done" });
  if (!doneResult.ok) {
    return <SetupNotice />;
  }

  let stats = {
    total: 0,
    items: [] as Awaited<ReturnType<typeof getDoneStats>>["items"],
  };
  try {
    stats = await getDoneStats();
  } catch (error) {
    if (!isSchemaSetupError(error)) throw error;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-slate-800">완료</h1>
      <p className="mb-6 text-sm text-slate-500">
        완료한 항목과 이번 주 통계입니다.
      </p>

      <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-medium text-green-800">
          이번 주 완료: {stats.total}건
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4">
        <EntryList
          entries={doneResult.data}
          categories={categoriesResult.data}
          showCheckbox
        />
      </div>
    </main>
  );
}
