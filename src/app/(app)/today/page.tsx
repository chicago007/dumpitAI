import { AppNav } from "@/components/layout/app-nav";
import { EntryList } from "@/components/entries/entry-list";
import { SetupNotice } from "@/components/setup/setup-notice";
import { loadCategories, loadEntries } from "@/lib/app-data";

export default async function TodayPage() {
  const categoriesResult = await loadCategories();
  if (!categoriesResult.ok) {
    return (
      <>
        <AppNav current="/today" />
        <SetupNotice />
      </>
    );
  }

  const todayResult = await loadEntries({ today: true });
  if (!todayResult.ok) {
    return (
      <>
        <AppNav current="/today" />
        <SetupNotice />
      </>
    );
  }

  const activeResult = await loadEntries({ status: "active", limit: 50 });
  const activeEntries = activeResult.ok ? activeResult.data : [];
  const noDueDate = activeEntries.filter((e) => !e.due_at);

  return (
    <>
      <AppNav current="/today" />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-1 text-xl font-bold text-slate-800">Today</h1>
        <p className="mb-6 text-sm text-slate-500">
          오늘 마감인 할 일과 일정입니다.
        </p>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            오늘 ({todayResult.data.length})
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white px-4">
            <EntryList
              entries={todayResult.data}
              categories={categoriesResult.data}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            마감일 없음 ({noDueDate.length})
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white px-4">
            <EntryList
              entries={noDueDate.slice(0, 20)}
              categories={categoriesResult.data}
            />
          </div>
        </section>
      </main>
    </>
  );
}
