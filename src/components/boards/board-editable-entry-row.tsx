"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  toggleBoardChecklistItem,
  updateBoardChecklistItem,
} from "@/actions/boards";
import { deleteBoardLinkedEntry } from "@/actions/entries";
import {
  formatBoardMoney,
  parseBoardMoney,
  parsePlannedAmount,
} from "@/lib/board-money";
import type { BoardCurrency } from "@/lib/board-money";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Entry } from "@/lib/types";
import {
  seoulDateInputFromIso,
  seoulIsoFromDateAndTime,
  seoulTimeInputFromIso,
} from "@/lib/dates";

interface BoardEditableEntryRowProps {
  entry: Entry;
  boardId: string;
  variant?: "checklist" | "schedule" | "memo";
}

function toTimeValue(iso: string | null) {
  return seoulTimeInputFromIso(iso);
}

function toDateValue(iso: string | null) {
  return seoulDateInputFromIso(iso);
}

function getPlannedAmount(entry: Entry): number | null {
  return parsePlannedAmount(entry.metadata?.plannedAmount);
}

function getPlannedCurrency(entry: Entry): BoardCurrency {
  const c = entry.metadata?.plannedCurrency;
  if (c === "USD" || c === "JPY" || c === "EUR" || c === "KRW") return c;
  return "KRW";
}

function amountToInputValue(amount: number | null): string {
  if (!amount) return "";
  return String(amount);
}

function parseAmountInput(text: string): {
  amount: number | null;
  currency: BoardCurrency;
} {
  const trimmed = text.trim();
  if (!trimmed) return { amount: null, currency: "KRW" };
  const parsed = parseBoardMoney(trimmed);
  if (parsed.amount !== null) return parsed;
  const digits = Number(trimmed.replace(/[^\d]/g, ""));
  return { amount: digits > 0 ? digits : null, currency: "KRW" };
}

export function BoardEditableEntryRow({
  entry,
  boardId,
  variant = "checklist",
}: BoardEditableEntryRowProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [date, setDate] = useState(toDateValue(entry.due_at));
  const [time, setTime] = useState(toTimeValue(entry.due_at));
  const [amountText, setAmountText] = useState(
    amountToInputValue(getPlannedAmount(entry)),
  );
  const [isPending, startTransition] = useTransition();

  const isDone = entry.status === "done";
  const showCheckbox = variant === "checklist";
  const showActions = variant === "checklist" || variant === "schedule" || variant === "memo";
  const plannedAmount = getPlannedAmount(entry);
  const plannedCurrency = getPlannedCurrency(entry);

  function refresh() {
    router.refresh();
  }

  function handleSaveChecklistMeta() {
    const parsed = parseAmountInput(amountText);
    const dueAt = date
      ? seoulIsoFromDateAndTime(date, "09:00")
      : null;
    const currentDate = toDateValue(entry.due_at);
    const currentAmount = getPlannedAmount(entry);

    const amountChanged =
      parsed.amount !== currentAmount ||
      (amountText.trim() === "" && currentAmount !== null);
    const dateChanged = date !== currentDate;

    if (!amountChanged && !dateChanged) return;

    startTransition(async () => {
      await updateBoardChecklistItem(boardId, entry.id, {
        dueAt,
        plannedAmount: parsed.amount,
        currency: parsed.currency,
      });
      refresh();
    });
  }

  function handleSave() {
    const trimmed = content.trim();
    if (!trimmed) return;

    if (variant === "checklist") {
      const parsed = parseAmountInput(amountText);
      const dueAt = date ? seoulIsoFromDateAndTime(date, "09:00") : null;
      startTransition(async () => {
        await updateBoardChecklistItem(boardId, entry.id, {
          content: trimmed,
          dueAt,
          plannedAmount: parsed.amount,
          currency: parsed.currency,
        });
        setIsEditing(false);
        refresh();
      });
      return;
    }

    let dueAt: string | null | undefined = undefined;
    if (variant === "schedule") {
      if (!date) return;
      dueAt = seoulIsoFromDateAndTime(date, time);
    }

    startTransition(async () => {
      const { updateBoardLinkedEntry } = await import("@/actions/entries");
      await updateBoardLinkedEntry({
        entryId: entry.id,
        boardId,
        content: trimmed,
        dueAt,
      });
      setIsEditing(false);
      refresh();
    });
  }

  function handleDelete() {
    const label = variant === "schedule" ? "일정" : "항목";
    if (!confirm(`${label}을 삭제할까요?`)) return;
    startTransition(async () => {
      await deleteBoardLinkedEntry(entry.id, boardId);
      refresh();
    });
  }

  if (isEditing) {
    return (
      <div className="space-y-2 rounded-md border border-border/50 bg-muted/30 p-2">
        {variant === "memo" ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
        ) : (
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-8 text-sm"
          />
        )}
        {variant === "checklist" && (
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-auto text-sm"
            />
            <Input
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="금액 (원, $, 엔)"
              className="h-8 w-32 text-sm"
            />
          </div>
        )}
        {variant === "schedule" && (
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-auto text-sm"
            />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-8 w-auto text-sm"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
            저장
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setContent(entry.content);
              setDate(toDateValue(entry.due_at));
              setTime(toTimeValue(entry.due_at));
              setAmountText(amountToInputValue(getPlannedAmount(entry)));
              setIsEditing(false);
            }}
          >
            취소
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 py-0.5">
      {showCheckbox && (
        <Checkbox
          size="sm"
          checked={isDone}
          disabled={isPending}
          className="shrink-0"
          onCheckedChange={(v) => {
            startTransition(async () => {
              await toggleBoardChecklistItem(boardId, entry.id, v === true);
              refresh();
            });
          }}
          aria-label={entry.content}
        />
      )}
      <div className="min-w-0 flex-1 text-sm">
        {variant === "schedule" && entry.due_at && (
          <span className="tabular-nums text-muted-foreground">
            {seoulTimeInputFromIso(entry.due_at)}{" "}
          </span>
        )}
        <span
          className={
            showCheckbox && isDone
              ? "text-muted-foreground line-through"
              : "text-foreground"
          }
        >
          {entry.content}
        </span>
        {!showCheckbox && plannedAmount && (
          <span className="ml-2 text-xs tabular-nums text-amber-600">
            {formatBoardMoney(plannedAmount, plannedCurrency)}
          </span>
        )}
      </div>
      {showCheckbox && (
        <div
          className="flex shrink-0 items-center gap-1.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto"
        >
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={handleSaveChecklistMeta}
            disabled={isPending}
            className="h-7 w-[118px] text-xs tabular-nums"
            aria-label="날짜"
          />
          <Input
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            onBlur={handleSaveChecklistMeta}
            disabled={isPending}
            placeholder="금액"
            className="h-7 w-[72px] text-xs tabular-nums"
            aria-label="금액"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setIsEditing(true)}
            aria-label="수정"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
            aria-label="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {!showCheckbox && showActions && (
        <div className="flex shrink-0 gap-0.5 opacity-100 md:opacity-0 md:pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
            aria-label="수정"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
            aria-label="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
