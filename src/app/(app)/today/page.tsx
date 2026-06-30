import { CollapsibleSmartInput } from "@/components/capture/collapsible-smart-input";
import { EntryList } from "@/components/entries/entry-list";
import { PageShell, SectionCard } from "@/components/layout/page-shell";
import { SetupNotice } from "@/components/setup/setup-notice";
import { TodayCompletedSection } from "@/components/today/today-completed-section";
import { getEntriesCompletedToday } from "@/actions/entries";
import { getActiveSpace } from "@/actions/space";
import { loadCategories, loadEntries } from "@/lib/app-data";
import { VIEW_SPACE_LABELS } from "@/lib/spaces";

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

  let completedToday: Awaited<ReturnType<typeof getEntriesCompletedToday>> =
    [];
  try {
    completedToday = await getEntriesCompletedToday(activeSpace);
  } catch (err) {
    console.error("[TodayPage] getEntriesCompletedToday failed:", err);
    completedToday = [];
  }

  return (
    <PageShell
      title={`오늘 · ${VIEW_SPACE_LABELS[activeSpace]}`}
      description="오늘 마감인 할 일과 일정입니다."
    >
      <CollapsibleSmartInput entryType="todo" />

      <SectionCard
        title={`오늘 (${todayResult.data.length})`}
        contentClassName="px-4 pb-2"
      >
        <EntryList
          entries={todayResult.data}
          categories={categoriesResult.data}
          showTypeBadge
          showSpaceBadge={activeSpace === "all"}
        />
      </SectionCard>

      <TodayCompletedSection
        entries={completedToday}
        categories={categoriesResult.data}
        viewSpace={activeSpace}
      />

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
