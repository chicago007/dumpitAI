import { Sidebar, type SidebarCounts } from "@/components/layout/sidebar";
import { getActiveSpace } from "@/actions/space";
import { loadEntries } from "@/lib/app-data";

async function loadSidebarCounts(
  activeSpace: Awaited<ReturnType<typeof getActiveSpace>>,
): Promise<SidebarCounts> {
  const empty: SidebarCounts = {
    today: 0,
    memo: 0,
    todo: 0,
    schedule: 0,
    checklist: 0,
    done: 0,
  };

  const [activeResult, todayResult, doneResult] = await Promise.all([
    loadEntries({ status: "active", limit: 1000, space: activeSpace }),
    loadEntries({ today: true, space: activeSpace }),
    loadEntries({ status: "done", limit: 1000, space: activeSpace }),
  ]);

  if (!activeResult.ok) return empty;

  const active = activeResult.data;
  return {
    today: todayResult.ok ? todayResult.data.length : 0,
    memo: active.filter((e) => e.type === "memo").length,
    todo: active.filter((e) => e.type === "todo").length,
    schedule: active.filter((e) => e.type === "schedule").length,
    checklist: active.filter((e) => e.type === "checklist").length,
    done: doneResult.ok ? doneResult.data.length : 0,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeSpace = await getActiveSpace();
  const counts = await loadSidebarCounts(activeSpace);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar counts={counts} activeSpace={activeSpace} />
      <div className="md:pl-64">{children}</div>
    </div>
  );
}
