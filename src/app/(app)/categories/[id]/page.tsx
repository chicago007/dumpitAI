import { notFound } from "next/navigation";
import { EntryList } from "@/components/entries/entry-list";
import { TravelCategoryView } from "@/components/travel/travel-category-view";
import { SetupNotice } from "@/components/setup/setup-notice";
import { CategoryDot } from "@/components/ui/category-dot";
import { isTravelCategoryName, sumTravelAmount, formatCurrency } from "@/lib/travel";
import { loadCategories, loadEntries } from "@/lib/app-data";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categoriesResult = await loadCategories();

  if (!categoriesResult.ok) {
    return <SetupNotice />;
  }

  const category = categoriesResult.data.find((c) => c.id === id);
  if (!category) notFound();

  const entriesResult = await loadEntries({ categoryId: id });
  const entries = entriesResult.ok ? entriesResult.data : [];
  const isTravel = isTravelCategoryName(category.name);
  const totalAmount = isTravel ? sumTravelAmount(entries) : 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <CategoryDot color={category.color} size="md" />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {category.name}
          </h1>
          <p className="text-sm text-slate-500">
            {entries.length}건
            {isTravel && totalAmount > 0 && ` · 총 ${formatCurrency(totalAmount)}`}
          </p>
        </div>
      </div>
      {category.keywords?.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-slate-500">키워드 예시</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {category.keywords.slice(0, 8).map((kw) => (
              <span
                key={kw}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
      {isTravel ? (
        <TravelCategoryView
          entries={entries}
          categories={categoriesResult.data}
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-4">
          <EntryList entries={entries} categories={categoriesResult.data} />
        </div>
      )}
    </main>
  );
}
