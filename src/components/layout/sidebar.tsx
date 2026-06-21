"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  LayoutList,
  Menu,
  Plus,
  Settings,
  StickyNote,
} from "lucide-react";
import { SpaceSwitcher } from "@/components/layout/space-switcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ENTRY_TYPE_THEMES } from "@/lib/entry-type-theme";
import type { SidebarCounts } from "@/actions/entries";
import type { Space } from "@/lib/spaces";

export type { SidebarCounts };

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  dotColor?: string;
}

const TYPE_ITEMS: {
  href: string;
  label: string;
  key: keyof SidebarCounts;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    href: ENTRY_TYPE_THEMES.memo.href,
    label: ENTRY_TYPE_THEMES.memo.label,
    key: "memo",
    color: ENTRY_TYPE_THEMES.memo.color,
    icon: <StickyNote className="h-4 w-4" />,
  },
  {
    href: ENTRY_TYPE_THEMES.todo.href,
    label: ENTRY_TYPE_THEMES.todo.label,
    key: "todo",
    color: ENTRY_TYPE_THEMES.todo.color,
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    href: ENTRY_TYPE_THEMES.schedule.href,
    label: ENTRY_TYPE_THEMES.schedule.label,
    key: "schedule",
    color: ENTRY_TYPE_THEMES.schedule.color,
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    href: ENTRY_TYPE_THEMES.checklist.href,
    label: ENTRY_TYPE_THEMES.checklist.label,
    key: "checklist",
    color: ENTRY_TYPE_THEMES.checklist.color,
    icon: <ClipboardList className="h-4 w-4" />,
  },
];

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">
      {count}
    </span>
  );
}

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-card text-primary shadow-card"
          : "text-foreground/80 hover:bg-card/80 hover:text-foreground",
      )}
    >
      {item.dotColor ? (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${item.dotColor}18`, color: item.dotColor }}
        >
          {item.icon}
        </span>
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {item.icon}
        </span>
      )}
      <span className="truncate">{item.label}</span>
      {typeof item.count === "number" && <CountBadge count={item.count} />}
    </Link>
  );
}

function SidebarContent({
  counts,
  pathname,
  onNavigate,
  activeSpace,
}: {
  counts: SidebarCounts;
  pathname: string;
  onNavigate: () => void;
  activeSpace: Space;
}) {
  const primaryItems: NavItem[] = [
    { href: "/", label: "입력", icon: <Plus className="h-4 w-4" /> },
    {
      href: "/today",
      label: "오늘",
      icon: <LayoutList className="h-4 w-4" />,
      count: counts.today,
    },
    {
      href: "/calendar",
      label: "달력",
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  const typeItems: NavItem[] = TYPE_ITEMS.map((t) => ({
    href: t.href,
    label: t.label,
    icon: t.icon,
    dotColor: t.color,
    count: counts[t.key],
  }));

  const secondaryItems: NavItem[] = [
    {
      href: "/done",
      label: "완료",
      icon: <CheckCircle2 className="h-4 w-4" />,
      count: counts.done,
    },
    {
      href: "/settings",
      label: "설정",
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex h-full flex-col bg-muted/50">
      <div className="px-4 py-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="text-xl font-bold tracking-tight text-foreground"
        >
          Dumpit
        </Link>
      </div>

      <div className="mb-2 px-2">
        <SpaceSwitcher activeSpace={activeSpace} />
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-2 pb-4">
        <div className="space-y-0.5">
          {primaryItems.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              active={pathname === item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <Separator className="bg-border/60" />

        <div>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            목록
          </p>
          <div className="space-y-0.5">
            {typeItems.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                active={pathname === item.href}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="space-y-0.5">
          {secondaryItems.map((item) => (
            <NavRow
              key={item.href}
              item={item}
              active={pathname === item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

export function Sidebar({
  counts,
  activeSpace,
}: {
  counts: SidebarCounts;
  activeSpace: Space;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const closeDrawer = () => setOpen(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-border/50 md:block">
        <SidebarContent
          counts={counts}
          pathname={pathname}
          onNavigate={closeDrawer}
          activeSpace={activeSpace}
        />
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/50 bg-card/95 px-4 py-3 backdrop-blur-md md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/" className="text-base font-bold text-foreground">
          Dumpit
        </Link>
        <div className="ml-auto min-w-0 flex-1 max-w-[200px]">
          <SpaceSwitcher activeSpace={activeSpace} compact />
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SidebarContent
            counts={counts}
            pathname={pathname}
            onNavigate={closeDrawer}
            activeSpace={activeSpace}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
