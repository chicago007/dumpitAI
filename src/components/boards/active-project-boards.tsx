"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { BoardWithProgress } from "@/actions/boards";
import { toggleEntryDone } from "@/actions/entries";
import { Checkbox } from "@/components/ui/checkbox";
import { PROJECT_LABEL } from "@/lib/project-labels";
import {
  BOARD_PROJECT_TYPE_LABELS,
  type BoardMetadata,
  type BoardProjectType,
} from "@/lib/board-types";
import { seasonLabel, type TravelSeason } from "@/lib/travel-plan";
import { cn } from "@/lib/utils";

interface ActiveProjectBoardsProps {
  boards: BoardWithProgress[];
}

export function ActiveProjectBoards({ boards }: ActiveProjectBoardsProps) {
  const active = boards.filter((b) => b.total > 0 && b.progress < 100);
  const [sectionOpen, setSectionOpen] = useState(true);

  if (active.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
      <button
        type="button"
        onClick={() => setSectionOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors hover:bg-muted/30"
        aria-expanded={sectionOpen}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            !sectionOpen && "-rotate-90",
          )}
        />
        <h2 className="text-sm font-semibold text-foreground">
          {PROJECT_LABEL} ({active.length})
        </h2>
      </button>

      {sectionOpen && (
        <div className="space-y-2 border-t border-border/50 px-3 py-0.5">
          {active.map((board) => (
            <ProjectBoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectBoardCard({ board }: { board: BoardWithProgress }) {
  const [open, setOpen] = useState(true);
  const [isPending, startTransition] = useTransition();
  const metadata = (board.metadata ?? {}) as BoardMetadata;
  const season =
    typeof metadata.season === "string" ? metadata.season : "";
  const entries = board.entries ?? [];
  const pending = entries.filter((e) => e.status === "active");
  const typeLabel =
    BOARD_PROJECT_TYPE_LABELS[board.project_type as BoardProjectType];

  function handleToggle(entryId: string) {
    startTransition(async () => {
      await toggleEntryDone(entryId, true);
    });
  }

  return (
    <section className="rounded-xl border border-border/60 bg-card shadow-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:opacity-90"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {board.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {typeLabel}
              {season && ` · ${seasonLabel(season as TravelSeason)}`}
              {" · "}준비 {board.done}/{board.total}
            </p>
          </div>
        </button>
        <Link
          href={`/boards/${board.id}`}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {PROJECT_LABEL}에서 보기
        </Link>
      </div>

      {open && (
        <div className="border-t border-border/50 px-3 py-2">
          {pending.length > 0 ? (
            <>
              <p className="mb-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                아직 준비 안 한 것 ({pending.length})
              </p>
              <ul className="space-y-0.5">
                {pending.slice(0, 8).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex h-10 min-h-10 items-center gap-2 text-sm"
                  >
                    <Checkbox
                      size="sm"
                      checked={false}
                      disabled={isPending}
                      onCheckedChange={() => handleToggle(entry.id)}
                      aria-label={entry.content}
                    />
                    <span className="truncate text-foreground">
                      {entry.content}
                    </span>
                  </li>
                ))}
              </ul>
              {pending.length > 8 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  + {pending.length - 8}개 더…
                </p>
              )}
            </>
          ) : board.total > 0 ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              모든 준비가 완료되었습니다!
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
