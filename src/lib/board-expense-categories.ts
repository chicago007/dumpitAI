import type { BoardBudgetCategory, BoardMetadata } from "@/lib/board-types";

export const DEFAULT_EXPENSE_CATEGORY_NAMES = [
  "식비",
  "교통",
  "숙박",
  "쇼핑",
  "기타",
] as const;

export function resolveExpenseCategories(
  metadata: BoardMetadata,
): BoardBudgetCategory[] {
  if (metadata.budgetCategories?.length) {
    return metadata.budgetCategories;
  }
  return DEFAULT_EXPENSE_CATEGORY_NAMES.map((name) => ({
    id: `default-${name}`,
    name,
    amount: 0,
  }));
}

export function materializeExpenseCategories(
  metadata: BoardMetadata,
): BoardBudgetCategory[] {
  if (metadata.budgetCategories?.length) {
    return metadata.budgetCategories.map((c) => ({ ...c }));
  }
  return DEFAULT_EXPENSE_CATEGORY_NAMES.map((name) => ({
    id: crypto.randomUUID(),
    name,
    amount: 0,
  }));
}

export function expenseCategoryNames(
  metadata: BoardMetadata,
): string[] {
  return resolveExpenseCategories(metadata).map((c) => c.name);
}
