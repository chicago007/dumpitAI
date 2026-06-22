"use client";

import { useState, useTransition } from "react";
import type { Category, Entry, EntryType } from "@/lib/types";
import {
  classifyContent,
  formatDueLabel,
  TYPE_LABELS,
} from "@/lib/classify";
import { CategoryDot } from "@/components/ui/category-dot";
import { TravelFields } from "@/components/travel/travel-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import {
  formatAmountInput,
  formatCurrency,
  getTravelMeta,
  isTravelCategoryName,
  parseAmount,
  parseAmountInput,
  parseDestination,
} from "@/lib/travel";
import { deleteEntry, moveEntryToSpace, toggleEntryDone, updateEntry } from "@/actions/entries";
import { getEntryTypeTheme } from "@/lib/entry-type-theme";
import { SPACE_LABELS, type Space } from "@/lib/spaces";

interface EntryItemProps {
  entry: Entry;
  categories: Category[];
  showCheckbox?: boolean;
  hideType?: boolean;
  cardRow?: boolean;
  accentRow?: boolean;
  compactMeta?: boolean;
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatEntryDue(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export function EntryItem({
  entry,
  categories,
  showCheckbox = true,
  hideType = false,
  cardRow = false,
  accentRow = false,
  compactMeta = false,
}: EntryItemProps) {
  const category = entry.categories as Category | null | undefined;
  const travelMeta = getTravelMeta(entry.metadata ?? {});
  const isDone = entry.status === "done";
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [type, setType] = useState<EntryType>(entry.type);
  const [categoryId, setCategoryId] = useState(
    entry.category_id ?? categories[0]?.id ?? "",
  );
  const [dueDate, setDueDate] = useState(toDateInputValue(entry.due_at));
  const [destination, setDestination] = useState(travelMeta.destination ?? "");
  const [amount, setAmount] = useState(formatAmountInput(travelMeta.amount));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editingCategory = categories.find((c) => c.id === categoryId);
  const isTravel = isTravelCategoryName(editingCategory?.name);

  function applyTravelFromContent(value: string) {
    const dest = parseDestination(value);
    const parsedAmount = parseAmount(value);
    if (dest) setDestination(dest);
    if (parsedAmount !== null) setAmount(formatAmountInput(parsedAmount));
  }

  function resetForm() {
    const meta = getTravelMeta(entry.metadata ?? {});
    setContent(entry.content);
    setType(entry.type);
    setCategoryId(entry.category_id ?? categories[0]?.id ?? "");
    setDueDate(toDateInputValue(entry.due_at));
    setDestination(meta.destination ?? "");
    setAmount(formatAmountInput(meta.amount));
    setError(null);
    setIsEditing(false);
  }

  function handleContentChange(value: string) {
    setContent(value);
    setError(null);
    if (value.trim().length > 0) {
      const result = classifyContent(value, categories);
      setType(result.type);
      if (result.categoryId) {
        setCategoryId(result.categoryId);
        const cat = categories.find((c) => c.id === result.categoryId);
        if (isTravelCategoryName(cat?.name)) {
          applyTravelFromContent(value);
        }
      }
      if (result.dueAt) setDueDate(result.dueAt.toISOString().slice(0, 10));
      if (isTravel) applyTravelFromContent(value);
    }
  }

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (isTravelCategoryName(cat?.name) && content.trim()) {
      applyTravelFromContent(content);
    }
    if (!isTravelCategoryName(cat?.name)) {
      setDestination("");
      setAmount("");
    }
  }

  function handleSave() {
    if (!content.trim()) return;

    startTransition(async () => {
      try {
        await updateEntry({
          id: entry.id,
          content,
          type,
          categoryId,
          dueAt: dueDate ? new Date(`${dueDate}T09:00:00`).toISOString() : null,
          destination: isTravel ? destination || null : null,
          amount: isTravel ? parseAmountInput(amount) : null,
        });
        setIsEditing(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "수정에 실패했습니다.");
      }
    });
  }

  const dueLabel = dueDate
    ? formatDueLabel(new Date(`${dueDate}T09:00:00`))
    : null;

  if (isEditing) {
    return (
      <li className="py-3 first:pt-0">
        <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={2}
            className="min-h-[72px] border-0 bg-card shadow-none focus-visible:ring-primary/30"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["memo", "todo", "schedule", "checklist"] as EntryType[]).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={type === t ? "default" : "secondary"}
                onClick={() => setType(t)}
                className="rounded-lg h-7 text-xs"
              >
                {TYPE_LABELS[t]}
              </Button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                type="button"
                size="sm"
                variant={categoryId === cat.id ? "default" : "outline"}
                onClick={() => handleCategoryChange(cat.id)}
                className="rounded-lg h-7 text-xs"
                style={
                  categoryId === cat.id
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : undefined
                }
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {isTravel && (
            <TravelFields
              destination={destination}
              amount={amount}
              onDestinationChange={setDestination}
              onAmountChange={setAmount}
            />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Label>공간</Label>
            {(["work", "personal"] as Space[]).map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={entry.space === s ? "default" : "outline"}
                disabled={isPending || entry.space === s}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await moveEntryToSpace(entry.id, s);
                      setError(null);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "공간 이동에 실패했습니다.",
                      );
                    }
                  });
                }}
                className="h-7 text-xs"
              >
                {SPACE_LABELS[s]}
              </Button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Label>마감일</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 w-auto text-xs"
            />
            {dueDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDueDate("")}
                className="h-7 text-xs"
              >
                제거
              </Button>
            )}
            {dueLabel && (
              <span className="text-xs text-muted-foreground">{dueLabel}</span>
            )}
          </div>

          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!content.trim() || isPending}
            >
              {isPending ? "저장 중..." : "저장"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetForm}
              disabled={isPending}
            >
              취소
            </Button>
          </div>
        </div>
      </li>
    );
  }

  function handleToggleDone(checked: boolean) {
    startTransition(async () => {
      await toggleEntryDone(entry.id, checked);
    });
  }

  const typeTheme = getEntryTypeTheme(entry.type);
  const compactMetaText = [
    category?.name,
    entry.due_at ? formatEntryDue(entry.due_at) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      className={cn(
        "group flex items-center gap-2.5",
        accentRow
          ? "border-l-[3px] bg-muted/20 px-3 py-3"
          : cardRow
            ? "rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5 shadow-sm"
            : "py-2.5 first:pt-0",
      )}
      style={
        accentRow
          ? { borderLeftColor: typeTheme.color }
          : undefined
      }
    >
      {showCheckbox && (
        <Checkbox
          size="sm"
          checked={isDone}
          onCheckedChange={(v) => handleToggleDone(v === true)}
          disabled={isPending}
          className="shrink-0"
          aria-label={isDone ? "완료 취소" : "완료"}
        />
      )}
      <p
        className={cn(
          "min-w-0 flex-1 truncate text-sm leading-snug",
          isDone
            ? "text-muted-foreground line-through"
            : "text-foreground font-medium",
        )}
      >
        {entry.content}
      </p>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        {compactMeta && compactMetaText ? (
          <span className="shrink-0 tabular-nums">{compactMetaText}</span>
        ) : (
          <>
            {category && (
              <span
                className="inline-flex max-w-[5.5rem] items-center gap-1 truncate rounded-md px-1.5 py-0.5 font-medium sm:max-w-none"
                style={{
                  backgroundColor: `${category.color}18`,
                  color: category.color,
                }}
              >
                <CategoryDot color={category.color} size="sm" />
                <span className="truncate">{category.name}</span>
              </span>
            )}
            {!hideType && (
              <span className="hidden shrink-0 sm:inline">
                {TYPE_LABELS[entry.type]}
              </span>
            )}
            {entry.due_at && (
              <span className="shrink-0 tabular-nums">
                {formatEntryDue(entry.due_at)}
              </span>
            )}
            {travelMeta.destination && (
              <span className="hidden shrink-0 lg:inline">
                {travelMeta.destination}
              </span>
            )}
            {travelMeta.amount !== null && (
              <span className="hidden shrink-0 lg:inline">
                {formatCurrency(travelMeta.amount)}
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8 text-muted-foreground"
          aria-label="수정"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <form action={deleteEntry.bind(null, entry.id)}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="삭제"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </li>
  );
}
