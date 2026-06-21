import { CaptureInput } from "@/components/capture/capture-input";
import { EntryList } from "@/components/entries/entry-list";
import { PageShell, SectionCard } from "@/components/layout/page-shell";
import { ActiveTravelPlans } from "@/components/travel/active-travel-plans";
import { DetectedTravelHints } from "@/components/travel/detected-travel-hints";
import { SetupNotice } from "@/components/setup/setup-notice";
import { getEntriesByDueRange } from "@/actions/entries";
import { getActiveTravelPlans } from "@/actions/travel-plan";
import { getTravelChecklistTemplate } from "@/actions/travel-checklist-settings";
import { getActiveSpace } from "@/actions/space";
import { loadCategories, loadEntries } from "@/lib/app-data";
import { findDetectedTravelEntries } from "@/lib/travel-plan";
import { SPACE_LABELS } from "@/lib/spaces";
import { TRAVEL_CATEGORY_NAME } from "@/lib/travel";
import type { Entry } from "@/lib/types";

function getWeekRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default async function HomePage() {
  const activeSpace = await getActiveSpace();
  const categoriesResult = await loadCategories(activeSpace);

  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const categories = categoriesResult.data;
  const isPersonal = activeSpace === "personal";

  const [todayResult, memoResult, activeResult, checklistResult, todoResult] =
    await Promise.all([
      loadEntries({ today: true, space: activeSpace }),
      loadEntries({
        type: "memo",
        status: "active",
        limit: 6,
        space: activeSpace,
      }),
      loadEntries({ status: "active", space: activeSpace }),
      loadEntries({ type: "checklist", space: activeSpace }),
      loadEntries({ type: "todo", status: "active", space: activeSpace }),
    ]);

  const travelTemplate = isPersonal
    ? await getTravelChecklistTemplate()
    : undefined;

  const todayEntries = todayResult.ok ? todayResult.data : [];
  const todayTodos = todayEntries
    .filter((e) => e.type === "todo" || e.type === "checklist")
    .slice(0, 8);

  let weekSchedules: Entry[] = [];
  try {
    const { start, end } = getWeekRange();
    weekSchedules = await getEntriesByDueRange({
      start,
      end,
      types: ["schedule"],
      space: activeSpace,
    });
    weekSchedules = weekSchedules
      .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""))
      .slice(0, 8);
  } catch {
    weekSchedules = [];
  }

  const recentMemos = memoResult.ok ? memoResult.data : [];

  const activeEntries = activeResult.ok ? activeResult.data : [];
  const checklistEntries = checklistResult.ok ? checklistResult.data : [];
  const todoEntries = todoResult.ok ? todoResult.data : [];
  const prepEntries = [...todoEntries, ...checklistEntries];

  const travelCategory = categories.find(
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
    <PageShell
      compact
      className="max-w-2xl"
      title={`${SPACE_LABELS[activeSpace]} · 빠른 입력`}
      description={
        isPersonal
          ? "Enter로 저장 · 여행·할일·일정을 한 줄로 입력"
          : "Enter로 저장 · 회의·보고서·할일을 한 줄로 입력"
      }
    >
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
        categories={categories}
        prepEntries={isPersonal ? prepEntries : []}
        travelTemplate={travelTemplate}
        activeSpace={activeSpace}
      />

      <div className="space-y-3">
        <SectionCard
          plain
          title={`오늘 할 일 (${todayTodos.length})`}
          contentClassName={
            todayTodos.length === 0 ? "px-3 py-2" : undefined
          }
        >
          <EntryList
            entries={todayTodos}
            categories={categories}
            variant="accent"
            emptyState={{
              message: "오늘 마감인 할 일이 없습니다",
              entryType: "todo",
              actionLabel: "할 일 추가",
              focusCapture: true,
              compact: true,
            }}
          />
        </SectionCard>

        <SectionCard plain title={`이번 주 일정 (${weekSchedules.length})`}>
          <EntryList
            entries={weekSchedules}
            categories={categories}
            variant="accent"
            showCheckbox={false}
            hideType
            emptyState={{
              message: "이번 주 일정이 없습니다",
              entryType: "schedule",
              actionLabel: "일정 추가",
              focusCapture: true,
            }}
          />
        </SectionCard>

        <SectionCard plain title={`최근 메모 (${recentMemos.length})`}>
          <EntryList
            entries={recentMemos}
            categories={categories}
            variant="accent"
            showCheckbox={false}
            hideType
            emptyState={{
              message: "저장된 메모가 없습니다",
              entryType: "memo",
              actionLabel: "메모 추가",
              focusCapture: true,
            }}
          />
        </SectionCard>
      </div>
    </PageShell>
  );
}
