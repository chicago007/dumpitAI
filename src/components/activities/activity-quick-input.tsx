"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createActivityFromText } from "@/actions/activities";
import { formatActivityInputHint } from "@/lib/activity-input";
import type { ActivityTypeDefinition } from "@/lib/activity-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function ActivityQuickInput({
  catalog,
}: {
  catalog: ActivityTypeDefinition[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const customLabels = catalog
    .filter((t) => !t.builtin)
    .map((t) => t.label)
    .slice(0, 2);
  const placeholder =
    customLabels.length > 0
      ? `독서 30분, 러닝 5km, ${customLabels[0]} 20분…`
      : "독서 30분, 러닝 5km, 헬스 1시간…";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    setError(null);
    startTransition(async () => {
      try {
        await createActivityFromText(trimmed);
        setText("");
        toast("활동을 기록했습니다.", "success");
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "저장에 실패했습니다.";
        setError(message);
        toast(message, "error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          placeholder={placeholder}
          disabled={isPending}
          className="flex-1"
          aria-label="활동 기록"
        />
        <Button type="submit" disabled={!text.trim() || isPending}>
          {isPending ? "저장 중…" : "기록"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatActivityInputHint(catalog)}
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
