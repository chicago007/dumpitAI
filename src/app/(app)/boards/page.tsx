import { BoardProgressList } from "@/components/boards/board-progress-list";
import { BoardSummaryCard } from "@/components/boards/board-summary-card";
import { BoardWizard } from "@/components/boards/board-wizard";
import { PageShell } from "@/components/layout/page-shell";
import { SetupNotice } from "@/components/setup/setup-notice";
import { getBoardsWithProgress } from "@/actions/boards";
import { getEntries } from "@/actions/entries";
import { getActiveSpace } from "@/actions/space";
import { computeOverallProgress } from "@/lib/board-progress";
import { loadCategories } from "@/lib/app-data";
import { PROJECT_LABEL } from "@/lib/project-labels";
import { SPACE_LABELS } from "@/lib/spaces";

export default async function BoardsPage() {
  const activeSpace = await getActiveSpace();
  const categoriesResult = await loadCategories(activeSpace);

  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const categories = categoriesResult.data;

  let boards: Awaited<ReturnType<typeof getBoardsWithProgress>> = [];
  try {
    boards = await getBoardsWithProgress(activeSpace);
  } catch {
    boards = [];
  }

  let todayCount = 0;
  try {
    const todayEntries = await getEntries({ today: true, space: activeSpace });
    todayCount = todayEntries.filter(
      (e) => e.type === "todo" || e.type === "checklist",
    ).length;
  } catch {
    todayCount = 0;
  }

  const overallProgress = computeOverallProgress(
    boards.map((b) => ({ progress: b.progress, total: b.total })),
  );

  return (
    <PageShell
      title={`${PROJECT_LABEL} · ${SPACE_LABELS[activeSpace]}`}
      description="관련 할 일을 묶고 진행률을 한눈에 확인합니다"
      actions={
        <BoardWizard activeSpace={activeSpace} categories={categories} />
      }
    >
      <BoardSummaryCard
        todayCount={todayCount}
        overallProgress={overallProgress}
      />

      <BoardProgressList boards={boards} />
    </PageShell>
  );
}
