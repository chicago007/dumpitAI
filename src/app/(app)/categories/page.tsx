import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import { CategoryDot } from "@/components/ui/category-dot";
import { SetupNotice } from "@/components/setup/setup-notice";
import { loadCategories, loadEntries } from "@/lib/app-data";

export default async function CategoriesPage() {
  const categoriesResult = await loadCategories();
  if (!categoriesResult.ok) {
    return (
      <>
        <AppNav current="/categories" />
        <SetupNotice />
      </>
    );
  }

  const entriesResult = await loadEntries({ status: "active" });
  const entries = entriesResult.ok ? entriesResult.data : [];

  const counts = categoriesResult.data.reduce<Record<string, number>>(
    (acc, cat) => {
      acc[cat.id] = entries.filter((e) => e.category_id === cat.id).length;
      return acc;
    },
    {},
  );

  return (
    <>
      <AppNav current="/categories" />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">카테고리</h1>
        <p className="mb-6 text-sm text-slate-500">
          분야별로 항목을 모아볼 수 있습니다.
        </p>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {categoriesResult.data.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
            >
              <CategoryDot color={cat.color} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{cat.name}</p>
                <p className="text-xs text-slate-500">
                  활성 {counts[cat.id] ?? 0}건
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
