"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SpaceSwitcher } from "@/components/layout/space-switcher";
import type { Space } from "@/lib/spaces";

export interface SidebarCounts {
  today: number;
  memo: number;
  todo: number;
  schedule: number;
  checklist: number;
  done: number;
}

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  dotColor?: string;
}

const TYPE_ITEMS: { href: string; label: string; key: keyof SidebarCounts; color: string }[] = [
  { href: "/memo", label: "메모", key: "memo", color: "#f59e0b" },
  { href: "/todo", label: "할일", key: "todo", color: "#3b82f6" },
  { href: "/schedule", label: "일정", key: "schedule", color: "#8b5cf6" },
  { href: "/checklist", label: "체크리스트", key: "checklist", color: "#10b981" },
];

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TodayIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4M9 14l2 2 4-4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto shrink-0 text-xs font-medium tabular-nums text-slate-400">
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
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-brand-50 font-semibold text-brand-700"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {item.dotColor ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.dotColor }}
        />
      ) : (
        <span className="shrink-0 text-slate-500">{item.icon}</span>
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
    { href: "/", label: "입력", icon: <PlusIcon /> },
    { href: "/today", label: "오늘", icon: <TodayIcon />, count: counts.today },
    { href: "/calendar", label: "달력", icon: <CalendarIcon /> },
  ];

  const typeItems: NavItem[] = TYPE_ITEMS.map((t) => ({
    href: t.href,
    label: t.label,
    dotColor: t.color,
    count: counts[t.key],
  }));

  const secondaryItems: NavItem[] = [
    { href: "/done", label: "완료", icon: <CheckIcon />, count: counts.done },
    { href: "/settings", label: "설정", icon: <SettingsIcon /> },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="text-lg font-bold text-slate-900"
        >
          Dumpit
        </Link>
      </div>

      <div className="mb-4">
        <SpaceSwitcher activeSpace={activeSpace} />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 pb-4">
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

        <div>
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white md:block">
        <SidebarContent
          counts={counts}
          pathname={pathname}
          onNavigate={closeDrawer}
          activeSpace={activeSpace}
        />
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
          aria-label="메뉴 열기"
        >
          <MenuIcon />
        </button>
        <Link href="/" className="text-base font-bold text-slate-900">
          Dumpit
        </Link>
        <div className="ml-auto">
          <SpaceSwitcher activeSpace={activeSpace} compact />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <button
              type="button"
              onClick={closeDrawer}
              className="absolute right-3 top-3 rounded-md p-1 text-slate-500 hover:bg-slate-100"
              aria-label="메뉴 닫기"
            >
              <CloseIcon />
            </button>
            <SidebarContent
              counts={counts}
              pathname={pathname}
              onNavigate={closeDrawer}
              activeSpace={activeSpace}
            />
          </aside>
        </div>
      )}
    </>
  );
}
