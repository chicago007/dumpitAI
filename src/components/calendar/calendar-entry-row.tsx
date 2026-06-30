"use client";

import { useTransition } from "react";
import { toggleEntryDone } from "@/actions/entries";
import { Checkbox } from "@/components/ui/checkbox";
import type { Entry } from "@/lib/types";

export function CalendarEntryRow({ entry }: { entry: Entry }) {
  const isDone = entry.status === "done";
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      await toggleEntryDone(entry.id, checked);
    });
  }

  return (
    <div className="flex items-start gap-1">
      <Checkbox
        size="sm"
        checked={isDone}
        disabled={isPending}
        onCheckedChange={(v) => handleToggle(v === true)}
        className="mt-0.5 rounded"
        aria-label={isDone ? "완료 취소" : "완료"}
      />

      <p
        className={`min-w-0 flex-1 break-words text-[10px] leading-snug sm:text-[11px] ${
          isDone ? "text-slate-400 line-through" : "text-slate-800"
        }`}
        title={entry.content}
      >
        {entry.content}
      </p>
    </div>
  );
}
