"use client";

import { useEffect, useState, useTransition } from "react";
import { persistActiveSpace, setActiveSpace } from "@/actions/space";
import {
  SPACE_DESCRIPTIONS,
  SPACE_LABELS,
  type Space,
} from "@/lib/spaces";
import { cn } from "@/lib/utils";
import { Briefcase, Home } from "lucide-react";

interface SpaceSwitcherProps {
  activeSpace: Space;
  compact?: boolean;
}

const SPACE_CONFIG: Record<
  Space,
  { Icon: typeof Briefcase; activeClass: string; idleClass: string }
> = {
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

  function handleSwitch(space: Space) {
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
          "grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/80 p-1",
          isPending && "opacity-80",
        )}
      >
        {(["work", "personal"] as Space[]).map((space) => {
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
                "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-all",
                isActive ? config.activeClass : config.idleClass,
              )}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{SPACE_LABELS[space]}</span>
            </button>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          {SPACE_DESCRIPTIONS[displaySpace]}
        </p>
      )}
    </div>
  );
}
