"use client";

import { useState } from "react";
import { SmartInput } from "@/components/capture/smart-input";
import { AddEntryButton } from "@/components/capture/collapsible-smart-input";
import type { EntryType } from "@/lib/types";

interface EntryListHeaderProps {
  title: string;
  subtitle?: string;
  entryType?: EntryType;
}

export function EntryListHeader({
  title,
  subtitle,
  entryType,
}: EntryListHeaderProps) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-bold text-slate-800">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {!isAdding && <AddEntryButton onClick={() => setIsAdding(true)} />}
      </div>
      {isAdding && (
        <SmartInput
          compact
          forceExpanded
          entryType={entryType}
          onCollapse={() => setIsAdding(false)}
        />
      )}
    </div>
  );
}
