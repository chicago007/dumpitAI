"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Loader2, Search, StickyNote } from "lucide-react";
import { searchEntries } from "@/actions/entries";
import { getEntryTypeTheme } from "@/lib/entry-type-theme";
import type { Entry, EntryType } from "@/lib/types";
import { cn } from "@/lib/utils";

function typeIcon(type: EntryType) {
  switch (type) {
    case "schedule":
      return Calendar;
    case "memo":
      return StickyNote;
    default:
      return CheckCircle2;
  }
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Entry[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, [close]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 1) {
      setResults([]);
      return;
    }
    const id = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const found = await searchEntries(term);
          setResults(found);
        } catch {
          setResults([]);
        }
      });
    }, 200);
    return () => window.clearTimeout(id);
  }, [query, open]);

  function handleSelect(entry: Entry) {
    close();
    router.push(getEntryTypeTheme(entry.type).href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={close}
      role="dialog"
      aria-modal="true"
      aria-label="검색"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-3.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메모·할일·일정 검색…"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {isPending && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {query.trim().length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              검색어를 입력하세요
            </p>
          ) : results.length === 0 && !isPending ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              결과가 없습니다
            </p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((entry) => {
                const theme = getEntryTypeTheme(entry.type);
                const Icon = typeIcon(entry.type);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelect(entry)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                      )}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                        style={{
                          backgroundColor: `${theme.color}18`,
                          color: theme.color,
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {entry.content}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {theme.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
