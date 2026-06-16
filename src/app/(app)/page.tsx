import { AppNav } from "@/components/layout/app-nav";
import { CaptureInput } from "@/components/capture/capture-input";
import { EntryList } from "@/components/entries/entry-list";
import { SetupNotice } from "@/components/setup/setup-notice";
import { loadCategories, loadEntries } from "@/lib/app-data";

export default async function HomePage() {
  const categoriesResult = await loadCategories();

  if (!categoriesResult.ok) {
    return (
      <>
        <AppNav current="/" />
        <SetupNotice />
      </>
    );
  }

  const entriesResult = await loadEntries({ limit: 20 });
  const entries = entriesResult.ok ? entriesResult.data : [];

  return (
    <>
      <AppNav current="/" />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-1 text-xl font-bold text-slate-800">빠른 입력</h1>
        <p className="mb-6 text-sm text-slate-500">
          한 줄만 입력하면 타입과 카테고리를 자동으로 분류합니다.
        </p>
        <CaptureInput categories={categoriesResult.data} />
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            최근 항목
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white px-4">
            <EntryList entries={entries} categories={categoriesResult.data} />
          </div>
        </section>
      </main>
    </>
  );
}
