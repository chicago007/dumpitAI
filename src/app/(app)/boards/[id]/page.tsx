import { notFound } from "next/navigation";
import { BoardDetailView } from "@/components/boards/board-detail-view";
import { SetupNotice } from "@/components/setup/setup-notice";
import { getBoard, getBoardLinkedEntries } from "@/actions/boards";
import { computeBoardProgress } from "@/lib/board-progress";
import { loadCategories } from "@/lib/app-data";
import { getActiveSpace } from "@/actions/space";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activeSpace = await getActiveSpace();
  const categoriesResult = await loadCategories(activeSpace);

  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const categories = categoriesResult.data;
  const board = await getBoard(id);

  if (!board || board.space !== activeSpace) {
    notFound();
  }

  let entries: Awaited<ReturnType<typeof getBoardLinkedEntries>> = [];
  try {
    entries = await getBoardLinkedEntries(id);
  } catch {
    entries = [];
  }

  const checklistEntries = entries.filter(
    (e) => e.type === "todo" || e.type === "checklist",
  );
  const progress = computeBoardProgress(checklistEntries);
  const done = checklistEntries.filter((e) => e.status === "done").length;
  const total = checklistEntries.length;

  const defaultCategory =
    categories.find((c) => c.name === "기타") ?? categories[0];

  if (!defaultCategory) {
    return <SetupNotice />;
  }

  return (
    <BoardDetailView
      board={board}
      entries={entries}
      categories={categories}
      progress={progress}
      done={done}
      total={total}
      defaultCategoryId={defaultCategory.id}
    />
  );
}
