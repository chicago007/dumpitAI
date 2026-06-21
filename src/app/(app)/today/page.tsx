import { EntryList } from "@/components/entries/entry-list";
import { PageShell, SectionCard } from "@/components/layout/page-shell";
import { SetupNotice } from "@/components/setup/setup-notice";
import { getActiveSpace } from "@/actions/space";
import { loadCategories, loadEntries } from "@/lib/app-data";
import { SPACE_LABELS } from "@/lib/spaces";

export default async function TodayPage() {
  const activeSpace = await getActiveSpace();
  const categoriesResult = await loadCategories(activeSpace);
  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const todayResult = await loadEntries({ today: true, space: activeSpace });
  if (!todayResult.ok) {
    return <SetupNotice />;
  }

  const activeResult = await loadEntries({
    status: "active",
    limit: 50,
    space: activeSpace,
  });
  const activeEntries = activeResult.ok ? activeResult.data : [];
  const noDueDate = activeEntries.filter((e) => !e.due_at);

  return (
    <PageShell
      title={`오늘 · ${SPACE_LABELS[activeSpace]}`}
      description="오늘 마감인 할 일과 일정입니다."
    >
      <SectionCard
        title={`오늘 (${todayResult.data.length})`}
        contentClassName="px-4 pb-2"
      >
        <EntryList
          entries={todayResult.data}
          categories={categoriesResult.data}
        />
      </SectionCard>

      <SectionCard
        title={`마감일 없음 (${noDueDate.length})`}
        contentClassName="px-4 pb-2"
      >
        <EntryList
          entries={noDueDate.slice(0, 20)}
          categories={categoriesResult.data}
        />
      </SectionCard>
    </PageShell>
  );
}
