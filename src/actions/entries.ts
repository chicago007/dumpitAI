"use server";

import { revalidatePath } from "next/cache";
import { learnCategoryKeyword } from "@/actions/categories";
import { createClient } from "@/lib/supabase/server";
import type { CreateEntryInput, EntryType, UpdateEntryInput } from "@/lib/types";
import { buildTravelMetadata } from "@/lib/travel";

export async function getEntries(filters?: {
  status?: string;
  type?: EntryType;
  categoryId?: string;
  today?: boolean;
  limit?: number;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("is_deleted", false)
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
}) {
  const supabase = await createClient();
  const startISO = params.start.toISOString();
  const endISO = params.end.toISOString();

  let query = supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("is_deleted", false)
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

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    content: input.content.trim(),
    type: input.type,
    category_id: input.categoryId,
    due_at: input.dueAt ?? null,
    status: "active",
    metadata: buildTravelMetadata(
      input.destination ?? null,
      input.amount ?? null,
    ),
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
  const { error } = await supabase
    .from("entries")
    .update({ is_deleted: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateEntryPaths();
}

export async function getDoneStats() {
  const supabase = await createClient();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("entries")
    .select("id, completed_at, categories(name, icon)")
    .eq("status", "done")
    .eq("is_deleted", false)
    .gte("completed_at", weekAgo.toISOString());

  if (error) throw new Error(error.message);
  return {
    total: data?.length ?? 0,
    items: data ?? [],
  };
}
