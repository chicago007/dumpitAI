import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "입력" },
  { href: "/calendar", label: "달력" },
  { href: "/today", label: "Today" },
  { href: "/categories", label: "카테고리" },
  { href: "/done", label: "완료" },
  { href: "/settings", label: "설정" },
];

export function AppNav({ current }: { current: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <Link href="/" className="text-base font-semibold text-slate-900">
          Dumpit
        </Link>
        <nav
          className="mt-2 flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="메인 메뉴"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                current === item.href
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
