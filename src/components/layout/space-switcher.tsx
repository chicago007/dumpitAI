"use client";

import { useTransition } from "react";
import { setActiveSpace } from "@/actions/space";
import {
  SPACE_DESCRIPTIONS,
  SPACE_LABELS,
  type Space,
} from "@/lib/spaces";

interface SpaceSwitcherProps {
  activeSpace: Space;
  compact?: boolean;
}

function WorkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

function PersonalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}

const SPACE_STYLES: Record<
  Space,
  { active: string; idle: string; Icon: typeof WorkIcon }
> = {
  work: {
    active: "bg-blue-600 text-white shadow-sm",
    idle: "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700",
    Icon: WorkIcon,
  },
  personal: {
    active: "bg-emerald-600 text-white shadow-sm",
    idle: "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700",
    Icon: PersonalIcon,
  },
};

export function SpaceSwitcher({ activeSpace, compact }: SpaceSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  function handleSwitch(space: Space) {
    if (space === activeSpace || isPending) return;
    startTransition(async () => {
      await setActiveSpace(space);
    });
  }

  return (
    <div className={compact ? "px-2" : "px-4"}>
      <div
        className={`grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 ${
          isPending ? "opacity-70" : ""
        }`}
      >
        {(["work", "personal"] as Space[]).map((space) => {
          const isActive = space === activeSpace;
          const styles = SPACE_STYLES[space];
          const Icon = styles.Icon;
          return (
            <button
              key={space}
              type="button"
              onClick={() => handleSwitch(space)}
              disabled={isPending}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                isActive ? styles.active : styles.idle
              }`}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{SPACE_LABELS[space]}</span>
            </button>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-2 px-1 text-xs text-slate-500">
          {SPACE_DESCRIPTIONS[activeSpace]}
        </p>
      )}
    </div>
  );
}
