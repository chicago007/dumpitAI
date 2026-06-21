import { CaptureInput } from "@/components/capture/capture-input";
import { EntryList } from "@/components/entries/entry-list";
import { ActiveTravelPlans } from "@/components/travel/active-travel-plans";
import { DetectedTravelHints } from "@/components/travel/detected-travel-hints";
import { SetupNotice } from "@/components/setup/setup-notice";
import { getActiveTravelPlans } from "@/actions/travel-plan";
import { getTravelChecklistTemplate } from "@/actions/travel-checklist-settings";
import { getActiveSpace } from "@/actions/space";
import { loadCategories, loadEntries } from "@/lib/app-data";
import { findDetectedTravelEntries } from "@/lib/travel-plan";
import { SPACE_LABELS } from "@/lib/spaces";
import { TRAVEL_CATEGORY_NAME } from "@/lib/travel";

export default async function HomePage() {
  const activeSpace = await getActiveSpace();
  const categoriesResult = await loadCategories(activeSpace);

  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const entriesResult = await loadEntries({ limit: 20, space: activeSpace });
  const activeResult = await loadEntries({
    status: "active",
    space: activeSpace,
  });
  const checklistResult = await loadEntries({
    type: "checklist",
    space: activeSpace,
  });
  const todoResult = await loadEntries({
    type: "todo",
    status: "active",
    space: activeSpace,
  });

  const isPersonal = activeSpace === "personal";
  const travelTemplate = isPersonal
    ? await getTravelChecklistTemplate()
    : undefined;

  const entries = entriesResult.ok ? entriesResult.data : [];
  const activeEntries = activeResult.ok ? activeResult.data : [];
  const checklistEntries = checklistResult.ok ? checklistResult.data : [];
  const todoEntries = todoResult.ok ? todoResult.data : [];
  const prepEntries = [...todoEntries, ...checklistEntries];

  const travelCategory = categoriesResult.data.find(
    (c) => c.name === TRAVEL_CATEGORY_NAME,
  );

  let travelPlans: Awaited<ReturnType<typeof getActiveTravelPlans>> = [];
  if (isPersonal) {
    try {
      travelPlans = await getActiveTravelPlans();
    } catch {
      travelPlans = [];
    }
  }

  const travelHints =
    isPersonal && travelCategory && travelTemplate
      ? findDetectedTravelEntries(
          activeEntries,
          travelPlans,
          prepEntries,
          travelTemplate,
        )
      : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-slate-800">
        {SPACE_LABELS[activeSpace]} · 빠른 입력
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        {isPersonal
          ? "예: \"8월10일 동경여행\" — 일정에 여행을 넣고, 비행기표·호텔 등 할일을 자동으로 만들어줍니다."
          : "예: \"내일 보고서 제출\", \"금요일 팀 회의\" — 업무 할일·일정을 빠르게 기록합니다."}
      </p>

      {isPersonal && travelCategory && travelHints.length > 0 && (
        <DetectedTravelHints
          hints={travelHints}
          travelCategoryId={travelCategory.id}
        />
      )}

      {isPersonal && travelTemplate && (
        <ActiveTravelPlans
          plans={travelPlans}
          prepEntries={prepEntries}
          template={travelTemplate}
        />
      )}

      <CaptureInput
        categories={categoriesResult.data}
        prepEntries={isPersonal ? prepEntries : []}
        travelTemplate={travelTemplate}
        activeSpace={activeSpace}
      />

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          최근 항목 · {SPACE_LABELS[activeSpace]}
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white px-4">
          <EntryList entries={entries} categories={categoriesResult.data} />
        </div>
      </section>
    </main>
  );
}
