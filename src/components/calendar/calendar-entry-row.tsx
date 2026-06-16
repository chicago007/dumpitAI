"use client";

import { toggleEntryDone } from "@/actions/entries";
import { TYPE_LABELS } from "@/lib/classify";
import type { Entry } from "@/lib/types";

export function CalendarEntryRow({ entry }: { entry: Entry }) {
  const isDone = entry.status === "done";

  return (
    <div className="flex items-start gap-2">
      <form action={toggleEntryDone.bind(null, entry.id, !isDone)}>
        <button
          type="submit"
          className={`mt-0.5 h-4 w-4 rounded border ${
            isDone
              ? "border-slate-900 bg-slate-900"
              : "border-slate-300 hover:border-slate-500"
          }`}
          aria-label={isDone ? "완료 취소" : "완료"}
        >
          {isDone && (
            <span className="block h-full w-full">
              <span className="sr-only">완료</span>
            </span>
          )}
        </button>
      </form>

      <p
        className={`min-w-0 flex-1 text-[11px] leading-5 ${
          isDone ? "text-slate-400 line-through" : "text-slate-700"
        }`}
        title={entry.content}
      >
        {TYPE_LABELS[entry.type]} {entry.content}
      </p>
    </div>
  );
}

