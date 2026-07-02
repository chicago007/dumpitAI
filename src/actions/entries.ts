"use server";

import { getActiveSpace } from "@/actions/space";
import { learnCategoryKeyword } from "@/actions/categories";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { revalidateEntryPaths } from "@/lib/revalidate";
import type { CreateEntryInput, EntryType, Space, UpdateEntryInput } from "@/lib/types";
import { getDefaultCategoryNameForSpace, getEntrySpace, type ViewSpace } from "@/lib/spaces";
import { getSeoulDayBounds } from "@/lib/dates";
import { buildTravelMetadata, mergeTravelMetadata } from "@/lib/travel";
import { createEntrySchema, parseOrThrow, updateEntrySchema } from "@/lib/validation";
import {
  getTravelPlanId,
  isTravelPlanEntry,
} from "@/lib/travel-plan";
import { syncTravelChecklistEntries as syncTravelChecklistEntriesInDb } from "@/lib/sync-travel-checklist";
import { getBoardCount } from "@/actions/boards";

/** 프로젝트에 속한 할일·여행 준비 할일은 일반 할일 목록에서 제외 */
function applyStandaloneTodoFilter<
  T extends {
    is: (col: string, val: null) => T;
    or: (filters: string) => T;
    not: (col: string, op: string, val: string) => T;
  },
>(
  query: T,
  filters?: {
    boardId?: string;
    type?: EntryType;
    today?: boolean;
    excludeBoard?: boolean;
  },
): T {
  if (filters?.boardId) return query;

  if (filters?.excludeBoard) {
    return query.is("board_id", null);
  }

  if (filters?.type === "todo") {
    return query
      .is("board_id", null)
      .or(
        "metadata->>fromTravelChecklist.is.null,metadata->>fromTravelChecklist.neq.true",
      );
  }

  if (filters?.today) {
    return query
      .is("board_id", null)
      .or(
        "metadata->>fromTravelChecklist.is.null,metadata->>fromTravelChecklist.neq.true,type.neq.todo",
      );
  }

  return query;
}

export async function getEntries(filters?: {
  status?: string;
  type?: EntryType;
  categoryId?: string;
  boardId?: string;
  today?: boolean;
  excludeBoard?: boolean;
  limit?: number;
  space?: ViewSpace;
}) {
  const supabase = await createClient();
  const viewSpace = filters?.space ?? (await getActiveSpace());

  let query = supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (viewSpace !== "all") {
    query = query.or(`space.eq.${viewSpace},space.is.null`);
  }

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
    const { start, end } = getSeoulDayBounds();
    query = query
      .eq("status", "active")
      .gte("due_at", start.toISOString())
      .lte("due_at", end.toISOString());
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  query = applyStandaloneTodoFilter(query, filters);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let entries = data ?? [];
  if (viewSpace !== "all") {
    entries = entries.filter((e) => getEntrySpace(e) === viewSpace);
  }
  return entries;
}

/** 오늘 completed_at 기준으로 완료 처리된 항목 */
export async function getEntriesCompletedToday(space?: ViewSpace) {
  const supabase = await createClient();
  const viewSpace = space ?? (await getActiveSpace());

  const { start, end } = getSeoulDayBounds();

  let query = supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("is_deleted", false)
    .eq("status", "done")
    .gte("completed_at", start.toISOString())
    .lte("completed_at", end.toISOString())
    .in("type", ["todo", "schedule", "memo", "checklist"])
    .order("completed_at", { ascending: false });

  if (viewSpace !== "all") {
    query = query.eq("space", viewSpace);
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
  viewSpace: ViewSpace,
  filters: {
    status?: string;
    type?: EntryType;
    today?: boolean;
    excludeBoard?: boolean;
  },
) {
  let query = supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false);

  if (viewSpace !== "all") {
    query = query.eq("space", viewSpace);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.today) {
    const { start, end } = getSeoulDayBounds();
    query = query
      .eq("status", "active")
      .gte("due_at", start.toISOString())
      .lte("due_at", end.toISOString());
  }

  query = applyStandaloneTodoFilter(query, filters);

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** 사이드바 숫자 — 전체 행 조회 없이 count만 */
export async function getSidebarCounts(
  viewSpace: ViewSpace,
): Promise<SidebarCounts> {
  const supabase = await createClient();

  const [today, memo, todo, schedule, boards, done] = await Promise.all([
    countEntries(supabase, viewSpace, { today: true }),
    countEntries(supabase, viewSpace, { status: "active", type: "memo" }),
    countEntries(supabase, viewSpace, { status: "active", type: "todo" }),
    countEntries(supabase, viewSpace, {
      status: "active",
      type: "schedule",
      excludeBoard: true,
    }),
    getBoardCount(viewSpace),
    countEntries(supabase, viewSpace, { status: "done" }),
  ]);

  return { today, memo, todo, schedule, boards, done };
}

export async function getEntriesByDueRange(params: {
  start: Date;
  end: Date;
  types?: EntryType[];
  space?: ViewSpace;
  includeDone?: boolean;
  boardId?: string;
  excludeBoard?: boolean;
}) {
  const supabase = await createClient();
  const viewSpace = params.space ?? (await getActiveSpace());
  const startISO = params.start.toISOString();
  const endISO = params.end.toISOString();

  let query = supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("is_deleted", false);

  if (!params.includeDone) {
    query = query
      .eq("status", "active")
      .gte("due_at", startISO)
      .lte("due_at", endISO);
  } else {
    query = query.or(
      `and(status.eq.active,due_at.gte.${startISO},due_at.lte.${endISO}),` +
        `and(status.eq.done,due_at.gte.${startISO},due_at.lte.${endISO}),` +
        `and(status.eq.done,completed_at.gte.${startISO},completed_at.lte.${endISO})`,
    );
  }

  if (viewSpace !== "all") {
    query = query.eq("space", viewSpace);
  }

  if (params.types && params.types.length > 0) {
    query = query.in("type", params.types);
  }

  if (params.boardId) {
    query = query.eq("board_id", params.boardId);
  } else if (params.excludeBoard) {
    query = query.is("board_id", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** 홈 여행 힌트 감지용 — memo·schedule 최근 항목만 */
export async function getTravelHintCandidateEntries(space?: ViewSpace) {
  const supabase = await createClient();
  const viewSpace = space ?? (await getActiveSpace());

  let query = supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("is_deleted", false)
    .eq("status", "active")
    .in("type", ["memo", "schedule"])
    .order("updated_at", { ascending: false })
    .limit(80);

  if (viewSpace !== "all") {
    query = query.or(`space.eq.${viewSpace},space.is.null`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let entries = data ?? [];
  if (viewSpace !== "all") {
    entries = entries.filter((e) => getEntrySpace(e) === viewSpace);
  }
  return entries;
}

export async function createEntry(input: CreateEntryInput) {
  const parsed = parseOrThrow(createEntrySchema, input);
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const viewSpace = await getActiveSpace();

  const { data: category } = await supabase
    .from("categories")
    .select("space")
    .eq("id", parsed.categoryId)
    .eq("user_id", user.id)
    .single();

  const entrySpace =
    parsed.space ??
    (category?.space as Space | undefined) ??
    (viewSpace !== "all" ? viewSpace : null);

  if (!entrySpace) {
    throw new Error("저장할 공간을 /업무 또는 /개인으로 지정해 주세요.");
  }

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    content: parsed.content.trim(),
    type: parsed.type,
    category_id: parsed.categoryId,
    board_id: parsed.boardId ?? null,
    due_at: parsed.dueAt ?? null,
    status: "active",
    space: entrySpace,
    metadata: {
      ...buildTravelMetadata(
        parsed.destination ?? null,
        parsed.amount ?? null,
      ),
      ...(parsed.metadata ?? {}),
    },
  });

  if (error) throw new Error(error.message);

  if (parsed.learnKeyword) {
    const words = parsed.content.trim().split(/\s+/);
    const keyword = words.find((w) => w.length >= 2) ?? "";
    if (keyword) {
      await learnCategoryKeyword(parsed.categoryId, keyword);
    }
  }

  revalidateEntryPaths();
}

/** 항목을 업무/개인 공간으로 이동 */
export async function moveEntryToSpace(entryId: string, targetSpace: Space) {
  const supabase = await createClient();
  const user = await getCurrentUser();
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
  const user = await getCurrentUser();
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
  const parsed = parseOrThrow(updateEntrySchema, input);
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: existing, error: fetchError } = await supabase
    .from("entries")
    .select("metadata")
    .eq("id", parsed.id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) throw new Error("항목을 찾을 수 없습니다.");

  const metadata = mergeTravelMetadata(
    existing.metadata as Record<string, unknown>,
    parsed.destination ?? null,
    parsed.amount ?? null,
  );

  const updates: Record<string, unknown> = {
    content: parsed.content.trim(),
    type: parsed.type,
    category_id: parsed.categoryId,
    due_at: parsed.dueAt ?? null,
    metadata,
  };
  if (parsed.completedAt !== undefined) {
    updates.completed_at = parsed.completedAt;
  }

  const { error } = await supabase
    .from("entries")
    .update(updates)
    .eq("id", parsed.id)
    .eq("user_id", user.id);

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
  const user = await getCurrentUser();
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

  revalidateEntryPaths(input.boardId);
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
  revalidateEntryPaths(boardId);
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

/** 일반 할일 목록 항목 수 (프로젝트 소속 제외) */
export async function getStandaloneTodoCount(): Promise<number> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { count, error } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", "todo")
    .eq("is_deleted", false)
    .is("board_id", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** 일반 할일 목록 항목 전체 삭제 (프로젝트·여행 준비 제외) */
export async function clearStandaloneTodos(): Promise<{ count: number }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: targets, error: fetchError } = await supabase
    .from("entries")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "todo")
    .eq("is_deleted", false)
    .is("board_id", null);

  if (fetchError) throw new Error(fetchError.message);

  const ids = (targets ?? []).map((row) => row.id);
  if (ids.length === 0) {
    return { count: 0 };
  }

  const { error } = await supabase
    .from("entries")
    .update({ is_deleted: true })
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateEntryPaths();
  return { count: ids.length };
}

/** 전역 검색 — 내용 부분 일치 (활성 공간 기준) */
export async function searchEntries(query: string, space?: ViewSpace) {
  const term = query.trim();
  if (term.length < 1) return [];

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const viewSpace = space ?? (await getActiveSpace());
  const escaped = term.replace(/[%_]/g, (m) => `\\${m}`);

  let q = supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .ilike("content", `%${escaped}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (viewSpace !== "all") {
    q = q.or(`space.eq.${viewSpace},space.is.null`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let entries = data ?? [];
  if (viewSpace !== "all") {
    entries = entries.filter((e) => getEntrySpace(e) === viewSpace);
  }
  return entries;
}

export async function deleteEntry(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
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

export async function getDoneStats(space?: ViewSpace) {
  const supabase = await createClient();
  const viewSpace = space ?? (await getActiveSpace());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let query = supabase
    .from("entries")
    .select("id, completed_at, categories(name, icon)")
    .eq("status", "done")
    .eq("is_deleted", false)
    .gte("completed_at", weekAgo.toISOString());

  if (viewSpace !== "all") {
    query = query.eq("space", viewSpace);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return {
    total: data?.length ?? 0,
    items: data ?? [],
  };
}
