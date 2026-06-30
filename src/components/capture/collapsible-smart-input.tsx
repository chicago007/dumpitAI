"use client";

import { useState } from "react";
import {
  SmartInput,
  type SmartInputProps,
} from "@/components/capture/smart-input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsibleSmartInput({
  entryType,
  className,
  align = "end",
}: SmartInputProps & { align?: "end" | "start" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div
        className={cn(
          "flex",
          align === "end" ? "justify-end" : "justify-start",
          className,
        )}
      >
        <AddEntryButton onClick={() => setIsOpen(true)} />
      </div>
    );
  }

  return (
    <SmartInput
      compact
      forceExpanded
      entryType={entryType}
      className={className}
      onCollapse={() => setIsOpen(false)}
    />
  );
}

export function AddEntryButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "h-9 w-9 rounded-full border-border/60 shadow-sm",
        className,
      )}
      onClick={onClick}
      aria-label="새 항목 추가"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
}
