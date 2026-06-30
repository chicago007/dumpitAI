import { SmartInput } from "@/components/capture/smart-input";
import { EntryList } from "@/components/entries/entry-list";
import { ActiveProjectBoards } from "@/components/boards/active-project-boards";
import { PageShell, SectionCard } from "@/components/layout/page-shell";
import { DetectedTravelHints } from "@/components/travel/detected-travel-hints";
import { SetupNotice } from "@/components/setup/setup-notice";
import { getBoardsWithProgress } from "@/actions/boards";
import { getEntriesByDueRange, getStandaloneTodoCount } from "@/actions/entries";
import { ClearTodosConfirm } from "@/components/entries/clear-todos-confirm";
import { getActiveTravelPlans } from "@/actions/travel-plan";
import { getTravelChecklistTemplate } from "@/actions/travel-checklist-settings";
import { getActiveSpace } from "@/actions/space";
import { loadCategories, loadEntries } from "@/lib/app-data";
import { findDetectedTravelEntries } from "@/lib/travel-plan";
import { VIEW_SPACE_LABELS } from "@/lib/spaces";
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

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ clearTodos?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  if (sp?.clearTodos === "1") {
    const count = await getStandaloneTodoCount();
    return <ClearTodosConfirm count={count} />;
  }

  const activeSpace = await getActiveSpace();
  const categoriesResult = await loadCategories(activeSpace);

  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const categories = categoriesResult.data;
  const isPersonal = activeSpace !== "work";

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

  let boards: Awaited<ReturnType<typeof getBoardsWithProgress>> = [];
  try {
    boards = await getBoardsWithProgress(activeSpace);
  } catch {
    boards = [];
  }

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
      excludeBoard: true,
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
      title={`${VIEW_SPACE_LABELS[activeSpace]} · 입력`}
      description="한 줄은 Enter로 바로 저장 · 여러 줄은 AI가 분류합니다"
    >
      {isPersonal && travelCategory && travelHints.length > 0 && (
        <DetectedTravelHints
          hints={travelHints}
          travelCategoryId={travelCategory.id}
        />
      )}

      <ActiveProjectBoards boards={boards} />

      <SmartInput />

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
            }}
          />
        </SectionCard>
      </div>
    </PageShell>
  );
}
