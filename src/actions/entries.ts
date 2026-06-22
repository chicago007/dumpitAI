"use server";

import { revalidatePath } from "next/cache";
import { getActiveSpace } from "@/actions/space";
import { learnCategoryKeyword } from "@/actions/categories";
import { createClient } from "@/lib/supabase/server";
import type { CreateEntryInput, EntryType, Space, UpdateEntryInput } from "@/lib/types";
import { getDefaultCategoryNameForSpace } from "@/lib/spaces";
import { buildTravelMetadata } from "@/lib/travel";
import {
  getTravelPlanId,
  isTravelPlanEntry,
} from "@/lib/travel-plan";
import { syncTravelChecklistEntries as syncTravelChecklistEntriesInDb } from "@/lib/sync-travel-checklist";
import { getBoardCount } from "@/actions/boards";

export async function getEntries(filters?: {
  status?: string;
  type?: EntryType;
  categoryId?: string;
  boardId?: string;
  today?: boolean;
  limit?: number;
  space?: Space;
}) {
  const supabase = await createClient();
  const activeSpace = filters?.space ?? (await getActiveSpace());

  let query = supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("is_deleted", false)
    .eq("space", activeSpace)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.boardId) {
    query = query.eq("board_id", filters.boardId);
  }
  if (filters?.today) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    query = query
      .eq("status", "active")
      .gte("due_at", start.toISOString())
      .lte("due_at", end.toISOString());
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface SidebarCounts {
  today: number;
  memo: number;
  todo: number;
  schedule: number;
  boards: number;
  done: number;
}

async function countEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  space: Space,
  filters: {
    status?: string;
    type?: EntryType;
    today?: boolean;
  },
) {
  let query = supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false)
    .eq("space", space);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.today) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    query = query
      .eq("status", "active")
      .gte("due_at", start.toISOString())
      .lte("due_at", end.toISOString());
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** 사이드바 숫자 — 전체 행 조회 없이 count만 */
export async function getSidebarCounts(space: Space): Promise<SidebarCounts> {
  const supabase = await createClient();

  const [today, memo, todo, schedule, boards, done] = await Promise.all([
    countEntries(supabase, space, { today: true }),
    countEntries(supabase, space, { status: "active", type: "memo" }),
    countEntries(supabase, space, { status: "active", type: "todo" }),
    countEntries(supabase, space, { status: "active", type: "schedule" }),
    getBoardCount(space),
    countEntries(supabase, space, { status: "done" }),
  ]);

  return { today, memo, todo, schedule, boards, done };
}

export async function getEntriesByDueRange(params: {
  start: Date;
  end: Date;
  types?: EntryType[];
  space?: Space;
}) {
  const supabase = await createClient();
  const activeSpace = params.space ?? (await getActiveSpace());
  const startISO = params.start.toISOString();
  const endISO = params.end.toISOString();

  let query = supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("is_deleted", false)
    .eq("space", activeSpace)
    .eq("status", "active")
    .gte("due_at", startISO)
    .lte("due_at", endISO);

  if (params.types && params.types.length > 0) {
    query = query.in("type", params.types);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

function revalidateEntryPaths() {
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/categories");
  revalidatePath("/memo");
  revalidatePath("/todo");
  revalidatePath("/schedule");
  revalidatePath("/boards");
  revalidatePath("/done");
}

export async function createEntry(input: CreateEntryInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const space = input.space ?? (await getActiveSpace());

  const { data: category } = await supabase
    .from("categories")
    .select("space")
    .eq("id", input.categoryId)
    .single();

  const entrySpace = (category?.space as Space) ?? space;

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    content: input.content.trim(),
    type: input.type,
    category_id: input.categoryId,
    board_id: input.boardId ?? null,
    due_at: input.dueAt ?? null,
    status: "active",
    space: entrySpace,
    metadata: {
      ...buildTravelMetadata(
        input.destination ?? null,
        input.amount ?? null,
      ),
      ...(input.metadata ?? {}),
    },
  });

  if (error) throw new Error(error.message);

  if (input.learnKeyword) {
    const words = input.content.trim().split(/\s+/);
    const keyword = words.find((w) => w.length >= 2) ?? "";
    if (keyword) {
      await learnCategoryKeyword(input.categoryId, keyword);
    }
  }

  revalidateEntryPaths();
}

/** 항목을 업무/개인 공간으로 이동 */
export async function moveEntryToSpace(entryId: string, targetSpace: Space) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: entry, error: fetchError } = await supabase
    .from("entries")
    .select("id, space, board_id")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !entry) throw new Error("항목을 찾을 수 없습니다.");
  if (entry.space === targetSpace) return;

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("space", targetSpace)
    .eq("is_deleted", false);

  if (catError) throw new Error(catError.message);

  const preferred = getDefaultCategoryNameForSpace(targetSpace);
  const categoryId =
    categories?.find((c) => c.name === preferred)?.id ??
    categories?.[0]?.id;

  if (!categoryId) {
    throw new Error("이동할 공간에 카테고리가 없습니다.");
  }

  let boardId: string | null = entry.board_id;
  if (boardId) {
    const { data: board } = await supabase
      .from("boards")
      .select("space")
      .eq("id", boardId)
      .maybeSingle();
    if (board?.space !== targetSpace) boardId = null;
  }

  const { error } = await supabase
    .from("entries")
    .update({
      space: targetSpace,
      category_id: categoryId,
      board_id: boardId,
    })
    .eq("id", entryId);

  if (error) throw new Error(error.message);
  revalidateEntryPaths();
}

export async function assignEntryCategory(entryId: string, categoryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("entries")
    .update({ category_id: categoryId, type: "checklist" })
    .eq("id", entryId);

  if (error) throw new Error(error.message);
  revalidateEntryPaths();
}

/** 여행 체크리스트 표 항목을 모두 여행 카테고리로 맞춤 */
export async function syncTravelChecklistEntries(travelCategoryId: string) {
  await syncTravelChecklistEntriesInDb(travelCategoryId);
  revalidateEntryPaths();
}

export async function updateEntry(input: UpdateEntryInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("entries")
    .update({
      content: input.content.trim(),
      type: input.type,
      category_id: input.categoryId,
      due_at: input.dueAt ?? null,
      metadata: buildTravelMetadata(
        input.destination ?? null,
        input.amount ?? null,
      ),
    })
    .eq("id", input.id);

  if (error) throw new Error(error.message);
  revalidateEntryPaths();
}

/** 보드 연결 항목 — metadata 유지 */
export async function updateBoardLinkedEntry(input: {
  entryId: string;
  boardId: string;
  content: string;
  dueAt?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: entry, error: fetchError } = await supabase
    .from("entries")
    .select("metadata, board_id")
    .eq("id", input.entryId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !entry) throw new Error("항목을 찾을 수 없습니다.");
  if (entry.board_id !== input.boardId) {
    throw new Error("보드에 연결된 항목만 수정할 수 있습니다.");
  }

  const updates: Record<string, unknown> = {
    content: input.content.trim(),
  };
  if (input.dueAt !== undefined) {
    updates.due_at = input.dueAt;
  }

  const { error } = await supabase
    .from("entries")
    .update(updates)
    .eq("id", input.entryId);

  if (error) throw new Error(error.message);

  revalidateEntryPaths();
  revalidatePath(`/boards/${input.boardId}`);
}

export async function deleteBoardLinkedEntry(entryId: string, boardId: string) {
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("entries")
    .select("metadata")
    .eq("id", entryId)
    .single();

  if (entry?.metadata) {
    const { cleanupChecklistEntryExpense, removeChecklistItemFromOrder } =
      await import("@/actions/boards");
    const meta = entry.metadata as Record<string, unknown>;
    await cleanupChecklistEntryExpense(boardId, entryId, meta);
    const groupId =
      typeof meta.checklistGroupId === "string" ? meta.checklistGroupId : null;
    await removeChecklistItemFromOrder(boardId, groupId, entryId);
  }

  await deleteEntry(entryId);
  revalidatePath(`/boards/${boardId}`);
}

export async function toggleEntryDone(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("entries")
    .update({
      status: done ? "done" : "active",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateEntryPaths();
}

export async function deleteEntry(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: entry, error: fetchError } = await supabase
    .from("entries")
    .select("id, type, metadata, due_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const metadata = entry?.metadata ?? {};
  const travelPlanId = getTravelPlanId(metadata);
  const isTravelSchedule =
    entry?.type === "schedule" &&
    (isTravelPlanEntry(metadata) || travelPlanId !== null);

  const idsToDelete = [id];

  if (isTravelSchedule) {
    if (travelPlanId) {
      const { data: linked, error: linkedError } = await supabase
        .from("entries")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .filter("metadata->>travelPlanId", "eq", travelPlanId);

      if (linkedError) throw new Error(linkedError.message);

      for (const row of linked ?? []) {
        if (row.id !== id) idsToDelete.push(row.id);
      }
    } else {
      const destination =
        typeof metadata.destination === "string" ? metadata.destination : null;
      const dueAt = entry?.due_at ?? null;

      if (destination) {
        const { data: prepEntries, error: prepError } = await supabase
          .from("entries")
          .select("id, metadata, due_at")
          .eq("user_id", user.id)
          .eq("is_deleted", false)
          .in("type", ["todo", "checklist"]);

        if (prepError) throw new Error(prepError.message);

        for (const prep of prepEntries ?? []) {
          if (prep.id === id) continue;
          const prepMeta = prep.metadata ?? {};
          if (prepMeta.fromTravelChecklist !== true) continue;
          if (prepMeta.destination !== destination) continue;
          if (dueAt && prep.due_at && prep.due_at !== dueAt) continue;
          idsToDelete.push(prep.id);
        }
      }
    }
  }

  const { error } = await supabase
    .from("entries")
    .update({ is_deleted: true })
    .in("id", idsToDelete)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateEntryPaths();
}

export async function getDoneStats(space?: Space) {
  const supabase = await createClient();
  const activeSpace = space ?? (await getActiveSpace());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("entries")
    .select("id, completed_at, categories(name, icon)")
    .eq("status", "done")
    .eq("is_deleted", false)
    .eq("space", activeSpace)
    .gte("completed_at", weekAgo.toISOString());

  if (error) throw new Error(error.message);
  return {
    total: data?.length ?? 0,
    items: data ?? [],
  };
}
