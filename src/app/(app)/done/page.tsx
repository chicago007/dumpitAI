import { CompletedEntriesSection } from "@/components/entries/completed-entries-section";
import { SetupNotice } from "@/components/setup/setup-notice";
import { getActiveSpace } from "@/actions/space";
import { getDoneStats } from "@/actions/entries";
import { VIEW_SPACE_LABELS } from "@/lib/spaces";
import { isSchemaSetupError } from "@/lib/supabase/errors";
import { loadCategories, loadEntries } from "@/lib/app-data";

export default async function DonePage() {
  const activeSpace = await getActiveSpace();
  const categoriesResult = await loadCategories(activeSpace);
  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const doneResult = await loadEntries({ status: "done", space: activeSpace });
  if (!doneResult.ok) {
    return <SetupNotice />;
  }

  let stats = {
    total: 0,
    items: [] as Awaited<ReturnType<typeof getDoneStats>>["items"],
  };
  try {
    stats = await getDoneStats(activeSpace);
  } catch (error) {
    if (!isSchemaSetupError(error)) throw error;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-foreground">
        완료 · {VIEW_SPACE_LABELS[activeSpace]}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        완료한 항목과 이번 주 통계입니다.
      </p>

      <div className="mb-6 rounded-xl border border-primary/30 bg-primary/10 p-4">
        <p className="text-sm font-medium text-foreground">
          이번 주 완료: {stats.total}건
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <CompletedEntriesSection
          entries={doneResult.data}
          categories={categoriesResult.data}
          viewSpace={activeSpace}
          contentClassName="space-y-4"
          emptyMessage="완료한 항목이 없습니다."
        />
      </div>
    </main>
  );
}
