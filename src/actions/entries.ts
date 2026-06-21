"use server";

import { revalidatePath } from "next/cache";
import { learnCategoryKeyword } from "@/actions/categories";
import { getActiveSpace } from "@/actions/space";
import { createClient } from "@/lib/supabase/server";
import type { CreateEntryInput, EntryType, Space, UpdateEntryInput } from "@/lib/types";
import { buildTravelMetadata } from "@/lib/travel";
import {
  getTravelPlanId,
  isTravelPlanEntry,
} from "@/lib/travel-plan";
import { syncTravelChecklistEntries as syncTravelChecklistEntriesInDb } from "@/lib/sync-travel-checklist";

export async function getEntries(filters?: {
  status?: string;
  type?: EntryType;
  categoryId?: string;
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
  revalidatePath("/checklist");
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
