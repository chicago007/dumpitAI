import { EntryListHeader } from "@/components/entries/entry-list-header";
import { EntryList } from "@/components/entries/entry-list";
import { TravelPrepTodoGroups } from "@/components/todo/travel-prep-todo-groups";
import { ChecklistTemplateEditor } from "@/components/checklist/checklist-template-editor";
import { TravelChecklistTable } from "@/components/checklist/travel-checklist-table";
import { SetupNotice } from "@/components/setup/setup-notice";
import { PageShell, SectionCard } from "@/components/layout/page-shell";
import { CategoryDot } from "@/components/ui/category-dot";
import { TYPE_LABELS } from "@/lib/classify";
import { isTemplateEntry } from "@/lib/travel-checklist-template";
import { TRAVEL_CATEGORY_NAME } from "@/lib/travel";
import { loadCategories, loadEntries } from "@/lib/app-data";
import { syncTravelChecklistEntries } from "@/lib/sync-travel-checklist";
import { getChecklistTemplateForSpace } from "@/actions/travel-checklist-settings";
import { getActiveTravelPlans } from "@/actions/travel-plan";
import { getActiveSpace } from "@/actions/space";
import { groupTravelPrepTodos } from "@/lib/travel-plan";
import { VIEW_SPACE_LABELS } from "@/lib/spaces";
import type { Category, Entry, EntryType } from "@/lib/types";
import Link from "next/link";

export const TYPE_PATHS: Record<EntryType, string> = {
  memo: "/memo",
  todo: "/todo",
  schedule: "/schedule",
  checklist: "/checklist",
};

function sortSchedulesByDueDate(entries: Entry[]) {
  return [...entries].sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return a.due_at.localeCompare(b.due_at);
  });
}

function groupEntriesByCategory(entries: Entry[], categories: Category[]) {
  const byCategory = new Map<string, Entry[]>();
  const uncategorized: Entry[] = [];

  for (const entry of entries) {
    if (!entry.category_id) {
      uncategorized.push(entry);
      continue;
    }
    const list = byCategory.get(entry.category_id) ?? [];
    list.push(entry);
    byCategory.set(entry.category_id, list);
  }

  const groups: { category: Category | null; entries: Entry[] }[] = categories
    .filter((category) => byCategory.has(category.id))
    .map((category) => ({
      category,
      entries: byCategory.get(category.id)!,
    }));

  if (uncategorized.length > 0) {
    groups.push({ category: null, entries: uncategorized });
  }

  return groups;
}

export async function TypeEntriesPage({ type }: { type: EntryType }) {
  const label = TYPE_LABELS[type];
  const activeSpace = await getActiveSpace();
  const isPersonal = activeSpace !== "work";

  const categoriesResult = await loadCategories(activeSpace);
  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const travelCategory = categoriesResult.data.find(
    (c) => c.name === TRAVEL_CATEGORY_NAME,
  );

  if (type === "checklist" && travelCategory && isPersonal) {
    await syncTravelChecklistEntries(travelCategory.id);
  }

  const checklistTemplate =
    type === "checklist" && activeSpace !== "all"
      ? await getChecklistTemplateForSpace(activeSpace)
      : null;

  const travelTemplate =
    type === "checklist" && isPersonal ? checklistTemplate : null;
  const workTemplate =
    type === "checklist" && activeSpace === "work" ? checklistTemplate : null;

  const entriesResult = await loadEntries(
    type === "checklist"
      ? { type, space: activeSpace }
      : type === "schedule"
        ? { status: "active", type, space: activeSpace, excludeBoard: true }
        : { status: "active", type, space: activeSpace },
  );
  const todoForTable =
    type === "checklist" && isPersonal
      ? await loadEntries({ type: "todo", status: "active", space: activeSpace })
      : null;
  if (!entriesResult.ok) {
    return <SetupNotice />;
  }

  const entries =
    type === "schedule"
      ? sortSchedulesByDueDate(entriesResult.data)
      : entriesResult.data;

  if (type !== "checklist") {
    if (type === "todo" && isPersonal) {
      let travelPlans: Entry[] = [];
      try {
        travelPlans = await getActiveTravelPlans();
      } catch {
        travelPlans = [];
      }

      const { groups, otherTodos } = groupTravelPrepTodos(entries, travelPlans);

      return (
        <main className="mx-auto max-w-2xl px-4 py-5 md:py-8 space-y-4">
          <EntryListHeader
            title={`${label} · ${VIEW_SPACE_LABELS[activeSpace]}`}
            subtitle="여행 준비 할일은 묶어서 보고, 펼치기·숨기기로 정리할 수 있습니다."
            entryType="todo"
          />

          {groups.length > 0 && (
            <TravelPrepTodoGroups
              groups={groups}
              categories={categoriesResult.data}
            />
          )}

          {otherTodos.length > 0 && (
            <section className={groups.length > 0 ? "mt-8" : ""}>
              {groups.length > 0 && (
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  다른 할일 ({otherTodos.length})
                </h2>
              )}
              <SectionCard contentClassName="px-4 pb-2">
                <EntryList
                  entries={otherTodos}
                  categories={categoriesResult.data}
                  hideType
                />
              </SectionCard>
            </section>
          )}

          {groups.length === 0 && otherTodos.length === 0 && (
            <div className="rounded-xl border border-border bg-card px-4">
              <EntryList
                entries={[]}
                categories={categoriesResult.data}
                hideType
              />
            </div>
          )}
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <EntryListHeader
          title={`${label} · ${VIEW_SPACE_LABELS[activeSpace]}`}
          subtitle={`활성 ${entries.length}건`}
          entryType={type}
        />
        <div className="rounded-xl border border-border bg-card p-3">
          <EntryList
            entries={entries}
            categories={categoriesResult.data}
            hideType
            variant="accent"
          />
        </div>
      </main>
    );
  }

  const travelChecklistEntries = entriesResult.data;
  const prepEntriesForTable =
    todoForTable?.ok
      ? [...todoForTable.data, ...travelChecklistEntries]
      : travelChecklistEntries;
  const travelNonTemplateEntries = entriesResult.data.filter(
    (e) =>
      e.status === "active" &&
      travelCategory &&
      e.category_id === travelCategory.id &&
      !isTemplateEntry(e),
  );
  const otherChecklistEntries = entriesResult.data.filter(
    (e) => e.status === "active" && !isTemplateEntry(e),
  );
  const otherCategoryGroups = groupEntriesByCategory(
    otherChecklistEntries.filter(
      (e) => !travelCategory || e.category_id !== travelCategory.id,
    ),
    categoriesResult.data,
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <EntryListHeader
        title={`${label} · ${VIEW_SPACE_LABELS[activeSpace]}`}
        subtitle={
          activeSpace === "work"
            ? "업무 프로젝트 체크리스트를 편집하고 항목을 관리합니다."
            : "여행 체크리스트를 편집하고, 여행 입력 시 할일로 자동 생성되는 항목을 관리합니다."
        }
      />

      {workTemplate && (
        <ChecklistTemplateEditor initialTemplate={workTemplate} space="work" />
      )}

      {travelTemplate && (
        <ChecklistTemplateEditor initialTemplate={travelTemplate} space="personal" />
      )}

      {travelCategory && travelTemplate && (
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CategoryDot color={travelCategory.color} size="md" />
            <Link
              href={`/categories/${travelCategory.id}`}
              className="text-sm font-semibold text-foreground hover:text-muted-foreground"
            >
              {travelCategory.name}
            </Link>
            <span className="text-xs text-muted-foreground">여행 준비 표</span>
          </div>
          <TravelChecklistTable
            category={travelCategory}
            entries={prepEntriesForTable}
            template={travelTemplate}
          />
          {travelNonTemplateEntries.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-card px-4">
              <p className="pt-3 text-xs font-medium text-muted-foreground">
                {travelCategory.name} · 추가 항목
              </p>
              <EntryList
                entries={travelNonTemplateEntries}
                categories={categoriesResult.data}
                hideType
              />
            </div>
          )}
        </section>
      )}

      {otherCategoryGroups.map(({ category, entries: groupEntries }) => (
        <section key={category?.id ?? "uncategorized"} className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            {category ? (
              <>
                <CategoryDot color={category.color} size="md" />
                <Link
                  href={`/categories/${category.id}`}
                  className="text-sm font-semibold text-foreground hover:text-muted-foreground"
                >
                  {category.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {groupEntries.length}건
                </span>
              </>
            ) : (
              <h2 className="text-sm font-semibold text-foreground">
                미분류 ({groupEntries.length})
              </h2>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card px-4">
            <EntryList
              entries={groupEntries}
              categories={categoriesResult.data}
              hideType
            />
          </div>
        </section>
      ))}

      {otherCategoryGroups.length === 0 &&
        !travelCategory &&
        travelChecklistEntries.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            체크리스트 항목이 없습니다.
          </p>
        )}
    </main>
  );
}
