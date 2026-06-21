"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  addBoardExpense,
  deleteBoardExpense,
  updateBoardExpense,
} from "@/actions/boards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoardExpense, BoardMetadata } from "@/lib/board-types";
import {
  BOARD_CURRENCIES,
  formatBoardMoney,
  getBoardCurrency,
  parseBoardMoney,
  type BoardCurrency,
} from "@/lib/board-money";

interface BoardExpenseTabProps {
  boardId: string;
  metadata: BoardMetadata;
}

function expenseCurrency(exp: BoardExpense): BoardCurrency {
  const c = exp.currency;
  if (c === "USD" || c === "JPY" || c === "EUR" || c === "KRW") return c;
  return "KRW";
}

export function BoardExpenseTab({ boardId, metadata }: BoardExpenseTabProps) {
  const router = useRouter();
  const defaultCurrency = getBoardCurrency(metadata);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<BoardCurrency>(defaultCurrency);
  const [category, setCategory] = useState("식비");
  const [memo, setMemo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState<BoardCurrency>(defaultCurrency);
  const [editCategory, setEditCategory] = useState("");
  const [editMemo, setEditMemo] = useState("");

  const expenses = metadata.expenses ?? [];
  const categories = metadata.budgetCategories?.map((c) => c.name) ?? [
    "식비",
    "교통",
    "숙박",
    "쇼핑",
    "체크리스트",
    "기타",
  ];

  function refresh() {
    router.refresh();
  }

  function parseAmountInput(text: string, fallbackCurrency: BoardCurrency) {
    const parsed = parseBoardMoney(text);
    if (parsed.amount) {
      return { amount: parsed.amount, currency: parsed.currency };
    }
    const digits = Number(text.replace(/[^\d]/g, ""));
    return { amount: digits || 0, currency: fallbackCurrency };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { amount: parsed, currency: parsedCurrency } = parseAmountInput(
      amount,
      currency,
    );
    if (!parsed) return;
    startTransition(async () => {
      await addBoardExpense(boardId, {
        amount: parsed,
        category,
        memo: memo.trim(),
        currency: parsedCurrency,
      });
      setAmount("");
      setMemo("");
      refresh();
    });
  }

  function startEdit(exp: BoardExpense) {
    setEditingId(exp.id);
    setEditAmount(String(exp.amount));
    setEditCurrency(expenseCurrency(exp));
    setEditCategory(exp.category);
    setEditMemo(exp.memo);
  }

  function saveEdit(expId: string) {
    const { amount: parsed, currency: parsedCurrency } = parseAmountInput(
      editAmount,
      editCurrency,
    );
    if (!parsed) return;
    startTransition(async () => {
      await updateBoardExpense(boardId, expId, {
        amount: parsed,
        category: editCategory,
        memo: editMemo.trim(),
        currency: parsedCurrency,
      });
      setEditingId(null);
      refresh();
    });
  }

  function handleDelete(expId: string) {
    if (!confirm("지출 항목을 삭제할까요?")) return;
    startTransition(async () => {
      await deleteBoardExpense(boardId, expId);
      refresh();
    });
  }

  const byDate = new Map<string, BoardExpense[]>();
  for (const exp of expenses) {
    const list = byDate.get(exp.date) ?? [];
    list.push(exp);
    byDate.set(exp.date, list);
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-border/50 p-3"
      >
        <p className="text-sm font-medium text-foreground">+ 지출 추가</p>
        <div className="flex flex-wrap gap-2">
          <div className="space-y-1.5 flex-1 min-w-[120px]">
            <Label className="text-xs">금액</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="12,000원 · $50 · ¥1000"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">통화</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as BoardCurrency)}
              className="flex h-8 w-full min-w-[110px] rounded-md border border-input bg-card px-2 text-sm"
            >
              {BOARD_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">카테고리</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">메모</Label>
          <Input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="이치란라멘"
            className="h-8 text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          저장
        </Button>
      </form>

      {expenses.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          지출 기록이 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {Array.from(byDate.entries()).map(([date, items]) => (
            <section key={date}>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {date.slice(5).replace("-", "/")}
              </p>
              <ul className="space-y-2">
                {items.map((exp) =>
                  editingId === exp.id
                    ? (
                        <li
                          key={exp.id}
                          className="space-y-2 rounded-md border border-border/50 p-2"
                        >
                          <div className="flex gap-2">
                            <Input
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="h-8 text-sm flex-1"
                              placeholder="금액"
                            />
                            <select
                              value={editCurrency}
                              onChange={(e) =>
                                setEditCurrency(e.target.value as BoardCurrency)
                              }
                              className="flex h-8 min-w-[100px] rounded-md border border-input px-2 text-sm"
                            >
                              {BOARD_CURRENCIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.code}
                                </option>
                              ))}
                            </select>
                          </div>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input px-2 text-sm"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <Input
                            value={editMemo}
                            onChange={(e) => setEditMemo(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="메모"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={isPending}
                              onClick={() => saveEdit(exp.id)}
                            >
                              저장
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              취소
                            </Button>
                          </div>
                        </li>
                      )
                    : (
                        <li
                          key={exp.id}
                          className="group flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="text-muted-foreground">
                              {exp.category}
                            </span>
                            {exp.memo && (
                              <span className="ml-2 text-foreground">
                                {exp.memo}
                              </span>
                            )}
                            {exp.fromChecklist && (
                              <span className="ml-2 text-[10px] text-primary">
                                체크리스트
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums font-medium shrink-0">
                            {formatBoardMoney(
                              exp.amount,
                              expenseCurrency(exp),
                            )}
                          </span>
                          <div
                            className="flex shrink-0 gap-0.5 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto"
                          >
                            {!exp.fromChecklist && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => startEdit(exp)}
                                  aria-label="수정"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:text-destructive"
                                  onClick={() => handleDelete(exp.id)}
                                  aria-label="삭제"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </li>
                      ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
