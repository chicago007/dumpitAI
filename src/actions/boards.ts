"use server";

import { revalidatePath } from "next/cache";
import { getActiveSpace } from "@/actions/space";
import { createClient } from "@/lib/supabase/server";
import {
  appendToGroupOrder,
  getChecklistItemOrder,
  removeFromGroupOrder,
  reorderGroupOrder,
} from "@/lib/board-checklist-order";
import { computeBoardProgress } from "@/lib/board-progress";
import { parsePlannedAmount } from "@/lib/board-money";
import {
  getProjectTemplate,
  getTravelAiSuggestions,
} from "@/lib/board-templates";
import type {
  BoardAiSuggestion,
  BoardBudgetCategory,
  BoardChecklistGroup,
  BoardExpense,
  BoardMetadata,
  BoardProjectType,
} from "@/lib/board-types";
import type { Board, Entry, Space } from "@/lib/types";

export interface BoardWithProgress extends Board {
  progress: number;
  total: number;
  done: number;
}

function revalidateBoardPaths(boardId?: string) {
  revalidatePath("/");
  revalidatePath("/boards");
  if (boardId) revalidatePath(`/boards/${boardId}`);
}

function parseMetadata(raw: Record<string, unknown> | null | undefined): BoardMetadata {
  return (raw ?? {}) as BoardMetadata;
}

async function appendChecklistItemsToOrder(
  boardId: string,
  groupId: string,
  entryIds: string[],
) {
  if (entryIds.length === 0) return;

  const board = await getBoard(boardId);
  if (!board) return;

  const metadata = parseMetadata(board.metadata);
  const nextOrder = appendToGroupOrder(
    getChecklistItemOrder(metadata),
    groupId,
    entryIds,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("boards")
    .update({
      metadata: { ...metadata, checklistItemOrder: nextOrder },
    })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
}

export async function removeChecklistItemFromOrder(
  boardId: string,
  groupId: string | null,
  entryId: string,
) {
  if (!groupId) return;

  const board = await getBoard(boardId);
  if (!board) return;

  const metadata = parseMetadata(board.metadata);
  const nextOrder = removeFromGroupOrder(
    getChecklistItemOrder(metadata),
    groupId,
    entryId,
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("boards")
    .update({
      metadata: { ...metadata, checklistItemOrder: nextOrder },
    })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
}

export async function reorderChecklistItems(
  boardId: string,
  groupId: string,
  orderedEntryIds: string[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  const group = metadata.checklistGroups?.find((g) => g.id === groupId);
  if (!group) throw new Error("카테고리를 찾을 수 없습니다.");

  const nextOrder = reorderGroupOrder(
    getChecklistItemOrder(metadata),
    groupId,
    orderedEntryIds,
  );

  const { error } = await supabase
    .from("boards")
    .update({
      metadata: { ...metadata, checklistItemOrder: nextOrder },
    })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

async function upsertChecklistLinkedExpense(
  supabase: Awaited<ReturnType<typeof createClient>>,
  boardId: string,
  boardMeta: BoardMetadata,
  entryId: string,
  memo: string,
  amount: number,
  currency: string,
  entryMeta: Record<string, unknown>,
  expenseDate?: string,
): Promise<BoardExpense[]> {
  const date = expenseDate ?? new Date().toISOString().slice(0, 10);
  let expenses = [...(boardMeta.expenses ?? [])];
  const linkedId =
    typeof entryMeta.linkedExpenseId === "string"
      ? entryMeta.linkedExpenseId
      : null;

  if (linkedId) {
    expenses = expenses.map((e) =>
      e.id === linkedId
        ? {
            ...e,
            amount,
            memo,
            currency,
            date,
            sourceEntryId: entryId,
            fromChecklist: true,
          }
        : e,
    );
  } else {
    const expId = crypto.randomUUID();
    expenses.unshift({
      id: expId,
      date,
      category: "체크리스트",
      amount,
      memo,
      currency,
      sourceEntryId: entryId,
      fromChecklist: true,
    });
    entryMeta.linkedExpenseId = expId;
    await supabase
      .from("entries")
      .update({ metadata: entryMeta })
      .eq("id", entryId);
  }

  const { error } = await supabase
    .from("boards")
    .update({ metadata: { ...boardMeta, expenses } })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  return expenses;
}

async function removeChecklistLinkedExpense(
  supabase: Awaited<ReturnType<typeof createClient>>,
  boardId: string,
  boardMeta: BoardMetadata,
  entryId: string,
  entryMeta: Record<string, unknown>,
): Promise<void> {
  const linkedId = entryMeta.linkedExpenseId;
  if (typeof linkedId !== "string") return;

  const expenses = (boardMeta.expenses ?? []).filter((e) => e.id !== linkedId);
  delete entryMeta.linkedExpenseId;

  await supabase
    .from("entries")
    .update({ metadata: entryMeta })
    .eq("id", entryId);

  const { error } = await supabase
    .from("boards")
    .update({ metadata: { ...boardMeta, expenses } })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
}

export async function getBoards(space?: Space): Promise<Board[]> {
  const supabase = await createClient();
  const activeSpace = space ?? (await getActiveSpace());

  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("is_deleted", false)
    .eq("space", activeSpace)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Board[];
}

export async function getBoardCount(space?: Space): Promise<number> {
  const supabase = await createClient();
  const activeSpace = space ?? (await getActiveSpace());

  const { count, error } = await supabase
    .from("boards")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false)
    .eq("space", activeSpace);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getBoardEntries(boardId: string): Promise<Entry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("board_id", boardId)
    .eq("is_deleted", false)
    .in("type", ["todo", "checklist"])
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Entry[];
}

export async function getBoardLinkedEntries(boardId: string): Promise<Entry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("board_id", boardId)
    .eq("is_deleted", false)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Entry[];
}

export async function getBoardsWithProgress(
  space?: Space,
): Promise<BoardWithProgress[]> {
  const boards = await getBoards(space);
  if (boards.length === 0) return [];

  const supabase = await createClient();
  const boardIds = boards.map((b) => b.id);

  const { data: entries, error } = await supabase
    .from("entries")
    .select("*")
    .eq("is_deleted", false)
    .in("board_id", boardIds)
    .in("type", ["todo", "checklist"]);

  if (error) throw new Error(error.message);

  const byBoard = new Map<string, Entry[]>();
  for (const entry of (entries ?? []) as Entry[]) {
    if (!entry.board_id) continue;
    const list = byBoard.get(entry.board_id) ?? [];
    list.push(entry);
    byBoard.set(entry.board_id, list);
  }

  return boards.map((board) => {
    const boardEntries = byBoard.get(board.id) ?? [];
    const total = boardEntries.length;
    const done = boardEntries.filter((e) => e.status === "done").length;
    return {
      ...board,
      progress: computeBoardProgress(boardEntries),
      total,
      done,
    };
  });
}

export async function getBoard(id: string): Promise<Board | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error) return null;
  return data as Board;
}

export async function createBoard(input: {
  name: string;
  color?: string;
  space?: Space;
}) {
  const id = await createBoardWithWizard({
    name: input.name,
    color: input.color,
    space: input.space,
    projectType: "custom",
    defaultCategoryId: "",
    skipItems: true,
  });
  return id;
}

export async function createBoardWithWizard(input: {
  name: string;
  color?: string;
  space?: Space;
  projectType: BoardProjectType;
  startDate?: string | null;
  endDate?: string | null;
  budgetTotal?: number;
  destination?: string;
  season?: string;
  customTypeLabel?: string;
  defaultCategoryId: string;
  skipItems?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const space = input.space ?? (await getActiveSpace());
  const name = input.name.trim();
  if (!name) throw new Error("보드 이름을 입력해 주세요.");

  const template = getProjectTemplate(input.projectType);
  const budgetTotal = input.budgetTotal ?? 0;

  const checklistGroups: BoardChecklistGroup[] = template.checklistGroups.map(
    (g) => ({ id: crypto.randomUUID(), name: g.name }),
  );

  const budgetCategories: BoardBudgetCategory[] = template.budgetCategories.map(
    (c) => ({
      id: crypto.randomUUID(),
      name: c.name,
      amount: Math.round(budgetTotal * c.ratio),
    }),
  );

  const aiSuggestions: BoardAiSuggestion[] =
    input.projectType === "travel"
      ? getTravelAiSuggestions(input.destination, input.season).map((label) => ({
          id: crypto.randomUUID(),
          label,
        }))
      : (template.aiSuggestions ?? []).map((label) => ({
          id: crypto.randomUUID(),
          label,
        }));

  const metadata: BoardMetadata = {
    checklistGroups,
    budgetCategories,
    expenses: [],
    aiSuggestions,
    destination: input.destination,
    season: input.season,
    customTypeLabel: input.customTypeLabel,
    currency: "KRW",
  };

  const { data: board, error } = await supabase
    .from("boards")
    .insert({
      user_id: user.id,
      name,
      color: input.color ?? "#10b981",
      space,
      project_type: input.projectType,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      budget_total: budgetTotal,
      metadata,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const boardId = board.id as string;

  if (!input.skipItems && input.defaultCategoryId) {
    const inserts: {
      user_id: string;
      content: string;
      type: string;
      category_id: string;
      board_id: string;
      status: string;
      space: Space;
      metadata: Record<string, unknown>;
    }[] = [];

    for (let i = 0; i < template.checklistGroups.length; i++) {
      const group = template.checklistGroups[i];
      const groupId = checklistGroups[i]?.id;
      if (!groupId) continue;
      for (const label of group.items) {
        inserts.push({
          user_id: user.id,
          content: label,
          type: "todo",
          category_id: input.defaultCategoryId,
          board_id: boardId,
          status: "active",
          space,
          metadata: { checklistGroupId: groupId, fromBoardTemplate: true },
        });
      }
    }

    if (inserts.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("entries")
        .insert(inserts)
        .select("id, metadata");
      if (insertError) throw new Error(insertError.message);

      const checklistItemOrder: Record<string, string[]> = {};
      for (const entry of inserted ?? []) {
        const gid = (entry.metadata as Record<string, unknown>)
          .checklistGroupId;
        if (typeof gid !== "string") continue;
        const list = checklistItemOrder[gid] ?? [];
        list.push(entry.id);
        checklistItemOrder[gid] = list;
      }

      if (Object.keys(checklistItemOrder).length > 0) {
        const { error: orderError } = await supabase
          .from("boards")
          .update({
            metadata: { ...metadata, checklistItemOrder },
          })
          .eq("id", boardId);
        if (orderError) throw new Error(orderError.message);
      }
    }
  }

  revalidateBoardPaths(boardId);
  return boardId;
}

export async function cleanupChecklistEntryExpense(
  boardId: string,
  entryId: string,
  entryMetadata: Record<string, unknown>,
) {
  const linkedId = entryMetadata.linkedExpenseId;
  if (typeof linkedId !== "string") return;

  const supabase = await createClient();
  const board = await getBoard(boardId);
  if (!board) return;

  const boardMeta = parseMetadata(board.metadata);
  const entryMeta = { ...entryMetadata };
  await removeChecklistLinkedExpense(
    supabase,
    boardId,
    boardMeta,
    entryId,
    entryMeta,
  );
  revalidateBoardPaths(boardId);
}

export async function addChecklistGroup(boardId: string, name: string) {
  const supabase = await createClient();
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  const groups = metadata.checklistGroups ?? [];
  groups.push({ id: crypto.randomUUID(), name: name.trim() });

  const { error } = await supabase
    .from("boards")
    .update({ metadata: { ...metadata, checklistGroups: groups } })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function addChecklistItem(
  boardId: string,
  groupId: string,
  label: string,
  categoryId: string,
  options?: {
    plannedAmount?: number | null;
    currency?: string;
    dueAt?: string | null;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata: Record<string, unknown> = { checklistGroupId: groupId };
  if (options?.plannedAmount && options.plannedAmount > 0) {
    metadata.plannedAmount = options.plannedAmount;
    metadata.plannedCurrency = options.currency ?? "KRW";
  }

  const { data: inserted, error } = await supabase
    .from("entries")
    .insert({
      user_id: user.id,
      content: label.trim(),
      type: "todo",
      category_id: categoryId,
      board_id: boardId,
      status: "active",
      space: board.space,
      due_at: options?.dueAt ?? null,
      metadata,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const plannedAmount = parsePlannedAmount(options?.plannedAmount);
  if (plannedAmount) {
    const boardMeta = parseMetadata(board.metadata);
    const entryMeta = { ...metadata };
    const expenseDate =
      options?.dueAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    await upsertChecklistLinkedExpense(
      supabase,
      boardId,
      boardMeta,
      inserted.id,
      label.trim(),
      plannedAmount,
      options?.currency ?? boardMeta.currency ?? "KRW",
      entryMeta,
      expenseDate,
    );
  }

  await appendChecklistItemsToOrder(boardId, groupId, [inserted.id]);

  revalidateBoardPaths(boardId);
}

export async function updateBoardChecklistItem(
  boardId: string,
  entryId: string,
  input: {
    content?: string;
    dueAt?: string | null;
    plannedAmount?: number | null;
    currency?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const { data: entry, error: fetchError } = await supabase
    .from("entries")
    .select("*")
    .eq("id", entryId)
    .eq("board_id", boardId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !entry) throw new Error("항목을 찾을 수 없습니다.");

  const entryMeta = { ...(entry.metadata ?? {}) } as Record<string, unknown>;
  const boardMeta = parseMetadata(board.metadata);
  const updates: Record<string, unknown> = {};

  if (input.content !== undefined) {
    const trimmed = input.content.trim();
    if (!trimmed) throw new Error("항목 이름을 입력해 주세요.");
    updates.content = trimmed;
  }

  if (input.dueAt !== undefined) {
    updates.due_at = input.dueAt;
  }

  if (input.plannedAmount !== undefined) {
    const amount = parsePlannedAmount(input.plannedAmount);
    if (amount) {
      entryMeta.plannedAmount = amount;
      entryMeta.plannedCurrency =
        input.currency ??
        (typeof entryMeta.plannedCurrency === "string"
          ? entryMeta.plannedCurrency
          : boardMeta.currency ?? "KRW");
    } else {
      delete entryMeta.plannedAmount;
      delete entryMeta.plannedCurrency;
    }
  }

  updates.metadata = entryMeta;

  const { error: updateError } = await supabase
    .from("entries")
    .update(updates)
    .eq("id", entryId);

  if (updateError) throw new Error(updateError.message);

  const content =
    input.content !== undefined ? input.content.trim() : entry.content;
  const dueAt =
    input.dueAt !== undefined ? input.dueAt : (entry.due_at as string | null);
  const expenseDate =
    dueAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const amount =
    input.plannedAmount !== undefined
      ? parsePlannedAmount(input.plannedAmount)
      : parsePlannedAmount(entryMeta.plannedAmount);
  const currency =
    typeof entryMeta.plannedCurrency === "string"
      ? entryMeta.plannedCurrency
      : boardMeta.currency ?? "KRW";

  if (amount) {
    await upsertChecklistLinkedExpense(
      supabase,
      boardId,
      boardMeta,
      entryId,
      content,
      amount,
      currency,
      entryMeta,
      expenseDate,
    );
  } else if (input.plannedAmount !== undefined) {
    await removeChecklistLinkedExpense(
      supabase,
      boardId,
      boardMeta,
      entryId,
      entryMeta,
    );
  }

  revalidateBoardPaths(boardId);
}

export interface ChecklistImportInput {
  groupName: string;
  label: string;
  plannedAmount?: number | null;
  currency?: string;
}

function normalizeGroupKey(name: string): string {
  return name.trim().toLowerCase();
}

export async function importChecklistRows(
  boardId: string,
  rows: ChecklistImportInput[],
  categoryId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const validRows = rows
    .map((r) => ({
      groupName: r.groupName.trim() || "체크리스트",
      label: r.label.trim(),
      plannedAmount: parsePlannedAmount(r.plannedAmount),
      currency: r.currency,
    }))
    .filter((r) => r.label.length > 0);

  if (validRows.length === 0) {
    throw new Error("가져올 항목이 없습니다.");
  }
  if (validRows.length > 500) {
    throw new Error("한 번에 500개까지 가져올 수 있습니다.");
  }

  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  const groups = [...(metadata.checklistGroups ?? [])];
  const groupMap = new Map<string, string>();
  for (const g of groups) {
    groupMap.set(normalizeGroupKey(g.name), g.id);
  }

  const inserts: {
    user_id: string;
    content: string;
    type: string;
    category_id: string;
    board_id: string;
    status: string;
    space: Space;
    metadata: Record<string, unknown>;
  }[] = [];

  const expensePlans: {
    insertIndex: number;
    label: string;
    amount: number;
    currency: string;
  }[] = [];

  for (const row of validRows) {
    let groupId = groupMap.get(normalizeGroupKey(row.groupName));
    if (!groupId) {
      groupId = crypto.randomUUID();
      groups.push({ id: groupId, name: row.groupName });
      groupMap.set(normalizeGroupKey(row.groupName), groupId);
    }

    const entryMeta: Record<string, unknown> = {
      checklistGroupId: groupId,
      fromExcelImport: true,
    };

    const insertIndex = inserts.length;

    if (row.plannedAmount) {
      const currency = row.currency ?? metadata.currency ?? "KRW";
      entryMeta.plannedAmount = row.plannedAmount;
      entryMeta.plannedCurrency = currency;
      expensePlans.push({
        insertIndex,
        label: row.label,
        amount: row.plannedAmount,
        currency,
      });
    }

    inserts.push({
      user_id: user.id,
      content: row.label,
      type: "todo",
      category_id: categoryId,
      board_id: boardId,
      status: "active",
      space: board.space,
      metadata: entryMeta,
    });
  }

  const groupsChanged =
    groups.length > (metadata.checklistGroups ?? []).length;

  if (groupsChanged) {
    const { error: groupError } = await supabase
      .from("boards")
      .update({ metadata: { ...metadata, checklistGroups: groups } })
      .eq("id", boardId);
    if (groupError) throw new Error(groupError.message);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("entries")
    .insert(inserts)
    .select("id, content, metadata");

  if (insertError) throw new Error(insertError.message);

  if (expensePlans.length > 0 && inserted) {
    let expenses = [...(metadata.expenses ?? [])];
    const today = new Date().toISOString().slice(0, 10);

    for (const plan of expensePlans) {
      const entry = inserted[plan.insertIndex];
      if (!entry) continue;

      const expId = crypto.randomUUID();
      expenses.unshift({
        id: expId,
        date: today,
        category: "체크리스트",
        amount: plan.amount,
        memo: plan.label,
        currency: plan.currency,
        sourceEntryId: entry.id,
        fromChecklist: true,
      });

      const entryMeta = {
        ...(entry.metadata as Record<string, unknown>),
        linkedExpenseId: expId,
      };
      await supabase
        .from("entries")
        .update({ metadata: entryMeta })
        .eq("id", entry.id);
    }

    const { error: expenseError } = await supabase
      .from("boards")
      .update({ metadata: { ...metadata, expenses, checklistGroups: groups } })
      .eq("id", boardId);

    if (expenseError) throw new Error(expenseError.message);
  }

  const groupEntryIds = new Map<string, string[]>();
  for (const entry of inserted ?? []) {
    const gid = (entry.metadata as Record<string, unknown>).checklistGroupId;
    if (typeof gid !== "string") continue;
    const list = groupEntryIds.get(gid) ?? [];
    list.push(entry.id);
    groupEntryIds.set(gid, list);
  }

  for (const [gid, ids] of groupEntryIds) {
    await appendChecklistItemsToOrder(boardId, gid, ids);
  }

  revalidateBoardPaths(boardId);
  return validRows.length;
}

export async function toggleBoardChecklistItem(
  boardId: string,
  entryId: string,
  done: boolean,
) {
  const supabase = await createClient();
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const { data: entry, error: fetchError } = await supabase
    .from("entries")
    .select("*")
    .eq("id", entryId)
    .eq("board_id", boardId)
    .single();

  if (fetchError || !entry) throw new Error("항목을 찾을 수 없습니다.");

  const entryMeta = { ...(entry.metadata ?? {}) } as Record<string, unknown>;
  const boardMeta = parseMetadata(board.metadata);

  const plannedAmount = parsePlannedAmount(entryMeta.plannedAmount);
  const plannedCurrency =
    typeof entryMeta.plannedCurrency === "string"
      ? entryMeta.plannedCurrency
      : boardMeta.currency ?? "KRW";

  const { error: statusError } = await supabase
    .from("entries")
    .update({
      status: done ? "done" : "active",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", entryId);

  if (statusError) throw new Error(statusError.message);

  if (plannedAmount && done) {
    const expenseDate =
      entry.due_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    await upsertChecklistLinkedExpense(
      supabase,
      boardId,
      boardMeta,
      entryId,
      entry.content,
      plannedAmount,
      plannedCurrency,
      entryMeta,
      expenseDate,
    );
  }

  revalidateBoardPaths(boardId);
}

export async function submitBoardClassifiedInput(
  boardId: string,
  content: string,
  categoryId: string,
  defaultGroupId?: string,
) {
  const { classifyBoardInput } = await import("@/lib/board-classify");
  const result = classifyBoardInput(content);
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  let groups = [...(metadata.checklistGroups ?? [])];

  function resolveChecklistGroupId(
    groupName?: string,
    fallbackId?: string,
  ): string {
    if (groupName) {
      const key = normalizeGroupKey(groupName);
      const existing = groups.find((g) => normalizeGroupKey(g.name) === key);
      if (existing) return existing.id;
      const id = crypto.randomUUID();
      groups.push({ id, name: groupName.trim() });
      return id;
    }
    if (fallbackId) return fallbackId;
    if (groups[0]?.id) return groups[0].id;
    const id = crypto.randomUUID();
    groups.push({ id, name: "체크리스트" });
    return id;
  }

  const groupId = resolveChecklistGroupId(
    result.groupName,
    defaultGroupId,
  );

  switch (result.kind) {
    case "schedule":
      const dueAt =
        result.dueAt?.toISOString() ??
        new Date(`${new Date().toISOString().slice(0, 10)}T09:00:00`).toISOString();
      await addBoardSchedule(
        boardId,
        result.cleanedContent,
        dueAt,
        categoryId,
      );
      break;
    case "memo":
      await addBoardMemo(boardId, result.cleanedContent, categoryId);
      break;
    case "budget":
      if (result.amount) {
        await updateBoardBudget(boardId, result.amount, metadata.budgetCategories ?? []);
        const supabase = await createClient();
        await supabase
          .from("boards")
          .update({
            metadata: {
              ...metadata,
              currency: result.currency,
              checklistGroups: groups,
            },
          })
          .eq("id", boardId);
      }
      break;
    case "expense":
      if (result.amount) {
        await addBoardExpense(boardId, {
          amount: result.amount,
          category: "기타",
          memo: result.cleanedContent,
          currency: result.currency,
        });
      }
      break;
    default:
      await addChecklistItem(
        boardId,
        groupId,
        result.cleanedContent,
        categoryId,
        {
          plannedAmount: result.amount,
          currency: result.currency,
          dueAt: result.dueAt?.toISOString() ?? null,
        },
      );
      const groupsChanged =
        groups.length !== (metadata.checklistGroups ?? []).length;
      if (groupsChanged || result.groupName) {
        const supabase = await createClient();
        await supabase
          .from("boards")
          .update({
            metadata: { ...metadata, checklistGroups: groups },
          })
          .eq("id", boardId);
      }
      break;
  }

  revalidateBoardPaths(boardId);
  return result.kind;
}

/** Inbox @p 블록 미리보기 항목을 프로젝트 탭에 저장 */
export async function applyBoardPreviewItem(
  boardId: string,
  item: {
    kind: "checklist" | "schedule" | "memo" | "budget" | "expense" | "todo";
    content: string;
    dueAt: string | null;
    amount: number | null;
    currency: string;
    groupName: string | null;
  },
  categoryId: string,
  defaultGroupId?: string,
) {
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  let groups = [...(metadata.checklistGroups ?? [])];

  function resolveChecklistGroupId(
    groupName?: string | null,
    fallbackId?: string,
  ): string {
    if (groupName) {
      const key = normalizeGroupKey(groupName);
      const existing = groups.find((g) => normalizeGroupKey(g.name) === key);
      if (existing) return existing.id;
      const id = crypto.randomUUID();
      groups.push({ id, name: groupName.trim() });
      return id;
    }
    if (fallbackId) return fallbackId;
    if (groups[0]?.id) return groups[0].id;
    const id = crypto.randomUUID();
    groups.push({ id, name: "체크리스트" });
    return id;
  }

  const kind = item.kind === "todo" ? "checklist" : item.kind;
  const groupId = resolveChecklistGroupId(item.groupName, defaultGroupId);

  switch (kind) {
    case "schedule": {
      const dueAt =
        item.dueAt ??
        new Date(`${new Date().toISOString().slice(0, 10)}T09:00:00`).toISOString();
      await addBoardSchedule(boardId, item.content, dueAt, categoryId);
      break;
    }
    case "memo":
      await addBoardMemo(boardId, item.content, categoryId);
      break;
    case "budget": {
      const amount = item.amount ?? 0;
      if (amount > 0) {
        await updateBoardBudget(
          boardId,
          amount,
          metadata.budgetCategories ?? [],
        );
        const supabase = await createClient();
        await supabase
          .from("boards")
          .update({
            metadata: {
              ...metadata,
              currency: item.currency,
              checklistGroups: groups,
            },
          })
          .eq("id", boardId);
      }
      break;
    }
    case "expense": {
      const amount = item.amount ?? 0;
      if (amount > 0) {
        await addBoardExpense(boardId, {
          amount,
          category: "기타",
          memo: item.content,
          currency: item.currency,
        });
      }
      break;
    }
    default:
      await addChecklistItem(boardId, groupId, item.content, categoryId, {
        plannedAmount: item.amount,
        currency: item.currency,
        dueAt: item.dueAt,
      });
      if (groups.length !== (metadata.checklistGroups ?? []).length) {
        const supabase = await createClient();
        await supabase
          .from("boards")
          .update({
            metadata: { ...metadata, checklistGroups: groups },
          })
          .eq("id", boardId);
      }
      break;
  }

  revalidateBoardPaths(boardId);
  return kind;
}

export async function addAiSuggestionsToChecklist(
  boardId: string,
  suggestionIds: string[],
  categoryId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  const suggestions = metadata.aiSuggestions ?? [];
  const groups = metadata.checklistGroups ?? [];
  const groupId =
    groups[0]?.id ??
    (() => {
      const id = crypto.randomUUID();
      groups.push({ id, name: "AI 추천" });
      return id;
    })();

  const toAdd = suggestions.filter((s) => suggestionIds.includes(s.id));
  if (toAdd.length === 0) return;

  const inserts = toAdd.map((s) => ({
    user_id: user.id,
    content: s.label,
    type: "todo",
    category_id: categoryId,
    board_id: boardId,
    status: "active",
    space: board.space,
    metadata: {
      checklistGroupId: groupId,
      fromAiSuggestion: true,
      aiSuggestionId: s.id,
    },
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("entries")
    .insert(inserts)
    .select("id");
  if (insertError) throw new Error(insertError.message);

  const remaining = suggestions.filter((s) => !suggestionIds.includes(s.id));
  const { error: updateError } = await supabase
    .from("boards")
    .update({
      metadata: {
        ...metadata,
        checklistGroups: groups,
        aiSuggestions: remaining,
      },
    })
    .eq("id", boardId);

  if (updateError) throw new Error(updateError.message);

  const entryIds = (inserted ?? []).map((e) => e.id);
  await appendChecklistItemsToOrder(boardId, groupId, entryIds);

  revalidateBoardPaths(boardId);
}

export async function addBoardExpense(
  boardId: string,
  input: {
    amount: number;
    category: string;
    memo: string;
    date?: string;
    currency?: string;
    sourceEntryId?: string;
    fromChecklist?: boolean;
  },
) {
  const supabase = await createClient();
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  const expenses: BoardExpense[] = metadata.expenses ?? [];
  expenses.unshift({
    id: crypto.randomUUID(),
    date: input.date ?? new Date().toISOString().slice(0, 10),
    category: input.category,
    amount: input.amount,
    memo: input.memo,
    currency: input.currency ?? metadata.currency ?? "KRW",
    sourceEntryId: input.sourceEntryId,
    fromChecklist: input.fromChecklist,
  });

  const { error } = await supabase
    .from("boards")
    .update({ metadata: { ...metadata, expenses } })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function addBoardMemo(
  boardId: string,
  content: string,
  categoryId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    content: content.trim(),
    type: "memo",
    category_id: categoryId,
    board_id: boardId,
    status: "active",
    space: board.space,
    metadata: { boardMemo: true },
  });

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function addBoardSchedule(
  boardId: string,
  content: string,
  dueAt: string,
  categoryId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    content: content.trim(),
    type: "schedule",
    category_id: categoryId,
    board_id: boardId,
    due_at: dueAt,
    status: "active",
    space: board.space,
    metadata: { boardSchedule: true },
  });

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function updateBoardBudget(
  boardId: string,
  budgetTotal: number,
  categories: BoardBudgetCategory[],
) {
  const supabase = await createClient();
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);

  const { error } = await supabase
    .from("boards")
    .update({
      budget_total: budgetTotal,
      metadata: { ...metadata, budgetCategories: categories },
    })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function updateBoardCurrency(boardId: string, currency: string) {
  const supabase = await createClient();
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  const { error } = await supabase
    .from("boards")
    .update({ metadata: { ...metadata, currency } })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function updateBoardExpense(
  boardId: string,
  expenseId: string,
  input: {
    amount: number;
    category: string;
    memo: string;
    date?: string;
    currency?: string;
  },
) {
  const supabase = await createClient();
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  const expenses = (metadata.expenses ?? []).map((e) =>
    e.id === expenseId
      ? {
          ...e,
          amount: input.amount,
          category: input.category,
          memo: input.memo,
          date: input.date ?? e.date,
          currency: input.currency ?? e.currency,
        }
      : e,
  );

  const { error } = await supabase
    .from("boards")
    .update({ metadata: { ...metadata, expenses } })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function deleteBoardExpense(boardId: string, expenseId: string) {
  const supabase = await createClient();
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  const expenses = (metadata.expenses ?? []).filter((e) => e.id !== expenseId);

  const { error } = await supabase
    .from("boards")
    .update({ metadata: { ...metadata, expenses } })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function updateChecklistGroupName(
  boardId: string,
  groupId: string,
  name: string,
) {
  const supabase = await createClient();
  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("카테고리 이름을 입력해 주세요.");

  const metadata = parseMetadata(board.metadata);
  const groups = (metadata.checklistGroups ?? []).map((g) =>
    g.id === groupId ? { ...g, name: trimmed } : g,
  );

  const { error } = await supabase
    .from("boards")
    .update({ metadata: { ...metadata, checklistGroups: groups } })
    .eq("id", boardId);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function deleteChecklistGroup(boardId: string, groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const board = await getBoard(boardId);
  if (!board) throw new Error("보드를 찾을 수 없습니다.");

  const metadata = parseMetadata(board.metadata);
  const groups = metadata.checklistGroups ?? [];
  const group = groups.find((g) => g.id === groupId);
  if (!group) throw new Error("카테고리를 찾을 수 없습니다.");

  if (groups.length <= 1) {
    throw new Error("마지막 카테고리는 삭제할 수 없습니다.");
  }

  const { data: entries, error: fetchError } = await supabase
    .from("entries")
    .select("id, metadata")
    .eq("board_id", boardId)
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  if (fetchError) throw new Error(fetchError.message);

  const groupEntries = (entries ?? []).filter(
    (e) =>
      (e.metadata as Record<string, unknown> | null)?.checklistGroupId ===
      groupId,
  );

  const linkedExpenseIds = new Set<string>();
  for (const entry of groupEntries) {
    const linkedId = (entry.metadata as Record<string, unknown> | null)
      ?.linkedExpenseId;
    if (typeof linkedId === "string") linkedExpenseIds.add(linkedId);
  }

  const expenses = (metadata.expenses ?? []).filter(
    (e) => !linkedExpenseIds.has(e.id),
  );

  if (groupEntries.length > 0) {
    const { error: deleteError } = await supabase
      .from("entries")
      .update({ is_deleted: true })
      .in(
        "id",
        groupEntries.map((e) => e.id),
      )
      .eq("user_id", user.id);

    if (deleteError) throw new Error(deleteError.message);
  }

  const newGroups = groups.filter((g) => g.id !== groupId);
  const itemOrder = { ...getChecklistItemOrder(metadata) };
  delete itemOrder[groupId];

  const { error: updateError } = await supabase
    .from("boards")
    .update({
      metadata: {
        ...metadata,
        checklistGroups: newGroups,
        checklistItemOrder: itemOrder,
        expenses,
      },
    })
    .eq("id", boardId);

  if (updateError) throw new Error(updateError.message);
  revalidateBoardPaths(boardId);
}

export async function updateBoard(
  boardId: string,
  input: { name?: string; color?: string },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("보드 이름을 입력해 주세요.");
    updates.name = name;
  }
  if (input.color !== undefined) {
    updates.color = input.color;
  }
  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from("boards")
    .update(updates)
    .eq("id", boardId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(boardId);
}

export async function deleteBoard(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error: unlinkError } = await supabase
    .from("entries")
    .update({ board_id: null })
    .eq("board_id", id)
    .eq("user_id", user.id);

  if (unlinkError) throw new Error(unlinkError.message);

  const { error } = await supabase
    .from("boards")
    .update({ is_deleted: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateBoardPaths(id);
}
