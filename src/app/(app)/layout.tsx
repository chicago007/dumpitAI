import { Sidebar } from "@/components/layout/sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { CommandPalette } from "@/components/layout/command-palette";
import { ToastProvider } from "@/components/ui/toast";
import { getActiveSpace } from "@/actions/space";
import { getAppearanceTheme } from "@/actions/appearance";
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
  const activeTheme = await getAppearanceTheme();

  let counts = EMPTY_COUNTS;
  try {
    counts = await getSidebarCounts(activeSpace);
  } catch (err) {
    console.error("[AppLayout] getSidebarCounts failed:", err);
    counts = EMPTY_COUNTS;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <Sidebar
          counts={counts}
          activeSpace={activeSpace}
          activeTheme={activeTheme}
        />
        <div className="pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0 md:pl-[280px]">
          {children}
        </div>
        <MobileTabBar />
        <CommandPalette />
      </div>
    </ToastProvider>
  );
}
