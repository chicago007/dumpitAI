import { Sidebar } from "@/components/layout/sidebar";
import { getActiveSpace } from "@/actions/space";
import { getSidebarCounts, type SidebarCounts } from "@/actions/entries";

const EMPTY_COUNTS: SidebarCounts = {
  today: 0,
  memo: 0,
  todo: 0,
  schedule: 0,
  boards: 0,
  done: 0,
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeSpace = await getActiveSpace();

  let counts = EMPTY_COUNTS;
  try {
    counts = await getSidebarCounts(activeSpace);
  } catch {
    counts = EMPTY_COUNTS;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar counts={counts} activeSpace={activeSpace} />
      <div className="md:pl-[280px]">{children}</div>
    </div>
  );
}
