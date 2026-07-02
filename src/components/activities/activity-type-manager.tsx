"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { AddEntryButton } from "@/components/capture/collapsible-smart-input";
import {
  addCustomActivityType,
  removeCustomActivityType,
} from "@/actions/activity-settings";
import type { ActivityTypeDefinition } from "@/lib/activity-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function ActivityChip({
  type,
  onRemove,
  disabled,
}: {
  type: ActivityTypeDefinition;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 py-1 pl-2.5 text-sm text-foreground",
        onRemove ? "pr-1" : "pr-2.5",
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: type.color }}
      />
      {type.label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
          aria-label={`${type.label} 삭제`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function ActivityTypeManager({
  catalog,
}: {
  catalog: ActivityTypeDefinition[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const customTypes = catalog.filter((t) => !t.builtin);

  function openAdd() {
    setAdding(true);
    setError(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeAdd() {
    if (isPending) return;
    setAdding(false);
    setLabel("");
    setError(null);
  }

  function handleAdd(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || isPending) return;

    setError(null);
    startTransition(async () => {
      try {
        await addCustomActivityType(trimmed);
        setLabel("");
        setAdding(false);
        toast(`"${trimmed}" 활동을 추가했습니다.`, "success");
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "추가에 실패했습니다.";
        setError(message);
        toast(message, "error");
      }
    });
  }

  function handleRemove(key: string, name: string) {
    if (!confirm(`"${name}" 활동을 삭제할까요? 기존 기록은 유지됩니다.`)) {
      return;
    }

    startTransition(async () => {
      try {
        await removeCustomActivityType(key);
        toast(`"${name}" 활동을 삭제했습니다.`, "success");
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "삭제에 실패했습니다.";
        toast(message, "error");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {catalog.map((type) => (
          <ActivityChip
            key={type.key}
            type={type}
            disabled={isPending}
            onRemove={
              type.builtin
                ? undefined
                : () => handleRemove(type.key, type.label)
            }
          />
        ))}

        {adding ? (
          <form onSubmit={handleAdd} className="flex items-center gap-1.5">
            <Input
              ref={inputRef}
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeAdd();
                }
              }}
              onBlur={() => {
                if (!label.trim() && !isPending) closeAdd();
              }}
              placeholder="활동 이름"
              disabled={isPending}
              className="h-8 w-28 rounded-full px-3 text-sm sm:w-32"
              aria-label="새 활동 이름"
              maxLength={20}
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 rounded-full px-3"
              disabled={!label.trim() || isPending}
            >
              추가
            </Button>
          </form>
        ) : (
          <AddEntryButton
            onClick={openAdd}
            className="h-8 w-8"
            aria-label="활동 추가"
          />
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {customTypes.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">
          + 로 명상·영어 등 추가 · &quot;명상 20분&quot;처럼 기록
        </p>
      )}
    </div>
  );
}
