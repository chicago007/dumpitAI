"use client";

import { useEffect, useState, useTransition } from "react";
import { persistActiveSpace, setActiveSpace } from "@/actions/space";
import {
  SPACE_DESCRIPTIONS,
  VIEW_SPACE_LABELS,
  type ViewSpace,
} from "@/lib/spaces";
import { cn } from "@/lib/utils";
import { Briefcase, Home, LayoutGrid } from "lucide-react";

interface SpaceSwitcherProps {
  activeSpace: ViewSpace;
  compact?: boolean;
}

const VIEW_SPACES: ViewSpace[] = ["all", "work", "personal"];

const SPACE_CONFIG: Record<
  ViewSpace,
  { Icon: typeof Briefcase; activeClass: string; idleClass: string }
> = {
  all: {
    Icon: LayoutGrid,
    activeClass: "bg-violet-600 text-white shadow-sm",
    idleClass: "bg-card text-muted-foreground hover:text-foreground",
  },
  work: {
    Icon: Briefcase,
    activeClass: "bg-primary text-primary-foreground shadow-sm",
    idleClass: "bg-card text-muted-foreground hover:text-foreground",
  },
  personal: {
    Icon: Home,
    activeClass: "bg-emerald-600 text-white shadow-sm",
    idleClass: "bg-card text-muted-foreground hover:text-foreground",
  },
};

export function SpaceSwitcher({ activeSpace, compact }: SpaceSwitcherProps) {
  const [displaySpace, setDisplaySpace] = useState(activeSpace);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDisplaySpace(activeSpace);
  }, [activeSpace]);

  function handleSwitch(space: ViewSpace) {
    if (space === displaySpace) return;

    setDisplaySpace(space);

    startTransition(async () => {
      await setActiveSpace(space);
    });

    void persistActiveSpace(space);
  }

  return (
    <div className={compact ? "" : "px-2"}>
      <div
        className={cn(
          "grid grid-cols-3 gap-1 rounded-xl border border-border/60 bg-muted/80 p-1",
          isPending && "opacity-80",
        )}
      >
        {VIEW_SPACES.map((space) => {
          const isActive = space === displaySpace;
          const config = SPACE_CONFIG[space];
          const Icon = config.Icon;
          return (
            <button
              key={space}
              type="button"
              onClick={() => handleSwitch(space)}
              disabled={isPending && space !== displaySpace}
              className={cn(
                "flex items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-xs font-medium transition-all sm:gap-1.5 sm:text-sm",
                isActive ? config.activeClass : config.idleClass,
              )}
              aria-pressed={isActive}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} />
              <span>{VIEW_SPACE_LABELS[space]}</span>
            </button>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          {SPACE_DESCRIPTIONS[displaySpace]}
          {displaySpace === "all" && (
            <span className="mt-0.5 block">
              입력 시 /업무 또는 /개인으로 공간을 지정하세요
            </span>
          )}
        </p>
      )}
    </div>
  );
}
