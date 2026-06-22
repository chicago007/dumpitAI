"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateBoardBudget, updateBoardCurrency } from "@/actions/boards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardBudgetCategory, BoardMetadata } from "@/lib/board-types";
import { PROJECT_LABEL } from "@/lib/project-labels";
import {
  BOARD_CURRENCIES,
  formatBoardMoney,
  getBoardCurrency,
  sumBoardExpensesInCurrency,
  type BoardCurrency,
} from "@/lib/board-money";

interface BoardBudgetTabProps {
  boardId: string;
  budgetTotal: number;
  metadata: BoardMetadata;
}

export function BoardBudgetTab({
  boardId,
  budgetTotal,
  metadata,
}: BoardBudgetTabProps) {
  const router = useRouter();
  const boardCurrency = getBoardCurrency(metadata);
  const [isEditing, setIsEditing] = useState(false);
  const [totalText, setTotalText] = useState(String(budgetTotal));
  const [currency, setCurrency] = useState<BoardCurrency>(boardCurrency);
  const [categories, setCategories] = useState<BoardBudgetCategory[]>(
    metadata.budgetCategories ?? [],
  );
  const [isPending, startTransition] = useTransition();

  const used = sumBoardExpensesInCurrency(metadata.expenses, boardCurrency);
  const balance = budgetTotal - used;

  function handleSave() {
    const total = Number(totalText.replace(/[^\d]/g, "")) || 0;
    startTransition(async () => {
      if (currency !== boardCurrency) {
        await updateBoardCurrency(boardId, currency);
      }
      await updateBoardBudget(boardId, total, categories);
      setIsEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">예산</p>
          <p className="text-sm font-semibold tabular-nums">
            {formatBoardMoney(budgetTotal, boardCurrency)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">사용</p>
          <p className="text-sm font-semibold tabular-nums text-amber-600">
            {formatBoardMoney(used, boardCurrency)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">잔액</p>
          <p className="text-sm font-semibold tabular-nums text-primary">
            {formatBoardMoney(balance, boardCurrency)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">카테고리 예산</p>
        {!isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => {
              setTotalText(String(budgetTotal));
              setCurrency(boardCurrency);
              setCategories(metadata.budgetCategories ?? []);
              setIsEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            수정
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3 rounded-lg border border-border/50 p-3">
          <div className="flex flex-wrap gap-2">
            <div className="space-y-1.5 flex-1 min-w-[120px]">
              <label className="text-xs text-muted-foreground">총 예산</label>
              <Input
                value={totalText}
                onChange={(e) => setTotalText(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">통화</label>
              <select
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as BoardCurrency)
                }
                className="flex h-8 w-full min-w-[120px] rounded-md border border-input bg-card px-2 text-sm"
              >
                {BOARD_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          {categories.map((cat, idx) => (
            <div key={cat.id} className="flex gap-2 items-center">
              <Input
                value={cat.name}
                onChange={(e) => {
                  const next = [...categories];
                  next[idx] = { ...cat, name: e.target.value };
                  setCategories(next);
                }}
                className="h-8 text-sm flex-1"
              />
              <Input
                value={String(cat.amount)}
                onChange={(e) => {
                  const next = [...categories];
                  next[idx] = {
                    ...cat,
                    amount: Number(e.target.value.replace(/[^\d]/g, "")) || 0,
                  };
                  setCategories(next);
                }}
                className="h-8 text-sm w-28"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
              저장
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(false)}
            >
              취소
            </Button>
          </div>
        </div>
      ) : categories.length > 0 ? (
        <ul className="divide-y divide-border/50 rounded-lg border border-border/50">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between px-3 py-2.5 text-sm"
            >
              <span className="text-foreground">{cat.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatBoardMoney(cat.amount, boardCurrency)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {PROJECT_LABEL} 생성 시 예산을 입력하면 카테고리별 예산이 자동 설정됩니다.
        </p>
      )}
    </div>
  );
}
