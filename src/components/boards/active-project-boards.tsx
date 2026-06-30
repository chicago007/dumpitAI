"use client";

import { useTransition } from "react";
import Link from "next/link";
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

interface ActiveProjectBoardsProps {
  boards: BoardWithProgress[];
}

export function ActiveProjectBoards({ boards }: ActiveProjectBoardsProps) {
  const active = boards.filter((b) => b.total > 0 && b.progress < 100);
  if (active.length === 0) return null;

  const travelBoards = active.filter((b) => b.project_type === "travel");
  const otherBoards = active.filter((b) => b.project_type !== "travel");

  return (
    <section className="mb-8 space-y-4">
      {travelBoards.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-foreground">
            여행 준비 중
          </h2>
          {travelBoards.map((board) => (
            <ProjectBoardCard key={board.id} board={board} />
          ))}
        </>
      )}
      {otherBoards.length > 0 && (
        <>
          <h2
            className={
              travelBoards.length > 0
                ? "pt-2 text-sm font-semibold text-foreground"
                : "text-sm font-semibold text-foreground"
            }
          >
            {PROJECT_LABEL} 진행 중
          </h2>
          {otherBoards.map((board) => (
            <ProjectBoardCard key={board.id} board={board} />
          ))}
        </>
      )}
    </section>
  );
}

function ProjectBoardCard({ board }: { board: BoardWithProgress }) {
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
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">{board.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {typeLabel}
            {season && ` · ${seasonLabel(season as TravelSeason)}`}
            {" · "}준비 {board.done}/{board.total}
          </p>
        </div>
        <Link
          href={`/boards/${board.id}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          {PROJECT_LABEL}에서 보기
        </Link>
      </div>

      {pending.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
            아직 준비 안 한 것 ({pending.length})
          </p>
          <ul className="space-y-1.5">
            {pending.slice(0, 8).map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  size="sm"
                  checked={false}
                  disabled={isPending}
                  onCheckedChange={() => handleToggle(entry.id)}
                  aria-label={entry.content}
                />
                <span className="text-foreground">{entry.content}</span>
              </li>
            ))}
          </ul>
          {pending.length > 8 && (
            <p className="mt-2 text-xs text-muted-foreground">
              + {pending.length - 8}개 더…
            </p>
          )}
        </div>
      )}

      {pending.length === 0 && board.total > 0 && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          모든 준비가 완료되었습니다!
        </p>
      )}
    </div>
  );
}
