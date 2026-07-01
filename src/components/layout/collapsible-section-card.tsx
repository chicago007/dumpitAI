"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerActions?: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSectionCard({
  title,
  children,
  className,
  contentClassName,
  headerActions,
  defaultOpen = true,
}: CollapsibleSectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card shadow-card",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3.5 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:bg-muted/30"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
          />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </button>
        {headerActions ? (
          <div className="shrink-0">{headerActions}</div>
        ) : null}
      </div>

      {open && (
        <div
          className={cn("border-t border-border/50 px-3 py-0.5", contentClassName)}
        >
          {children}
        </div>
      )}
    </section>
  );
}
