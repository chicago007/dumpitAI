"use client";

import { toggleEntryDone } from "@/actions/entries";
import type { Entry } from "@/lib/types";

export function CalendarEntryRow({ entry }: { entry: Entry }) {
  const isDone = entry.status === "done";

  return (
    <div className="flex items-start gap-1">
      <form action={toggleEntryDone.bind(null, entry.id, !isDone)}>
        <button
          type="submit"
          className={`mt-0.5 h-3 w-3 shrink-0 rounded border sm:h-3.5 sm:w-3.5 ${
            isDone
              ? "border-slate-900 bg-slate-900"
              : "border-slate-300 hover:border-slate-500"
          }`}
          aria-label={isDone ? "완료 취소" : "완료"}
        />
      </form>

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
