"use client";

import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENTRY_TYPE_THEMES } from "@/lib/entry-type-theme";
import type { EntryType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<EntryType, LucideIcon> = {
  memo: StickyNote,
  todo: CheckCircle2,
  schedule: Calendar,
  checklist: ClipboardList,
};

interface EntryListEmptyProps {
  message: string;
  entryType: EntryType;
  actionLabel?: string;
  actionHref?: string;
  focusCapture?: boolean;
  compact?: boolean;
}

export function EntryListEmpty({
  message,
  entryType,
  actionLabel,
  actionHref,
  focusCapture = false,
  compact = false,
}: EntryListEmptyProps) {
  const accentColor = ENTRY_TYPE_THEMES[entryType].color;
  const Icon = TYPE_ICONS[entryType];

  function handleFocusCapture() {
    const el = document.getElementById("capture-input");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus();
  }

  const actionButton = actionLabel
    ? focusCapture
      ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1.5 px-2.5 text-xs font-medium",
              !compact && "mt-2.5",
            )}
            style={{
              borderColor: `${accentColor}40`,
              color: accentColor,
            }}
            onClick={handleFocusCapture}
          >
            <Icon className="h-3 w-3" strokeWidth={2} />
            {actionLabel}
          </Button>
        )
      : actionHref
        ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(
                "h-7 gap-1.5 px-2.5 text-xs font-medium",
                !compact && "mt-2.5",
              )}
              style={{
                borderColor: `${accentColor}40`,
                color: accentColor,
              }}
            >
              <Link href={actionHref}>
                <Icon className="h-3 w-3" strokeWidth={2} />
                {actionLabel}
              </Link>
            </Button>
          )
        : null
    : null;

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <p className="text-xs text-muted-foreground">{message}</p>
        {actionButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-3 text-center">
      <span
        className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-full"
        style={{
          backgroundColor: `${accentColor}14`,
          color: accentColor,
        }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <p className="text-xs text-muted-foreground">{message}</p>
      {actionButton}
    </div>
  );
}
