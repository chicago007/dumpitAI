"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildTravelMetadata } from "@/lib/travel";
import {
  buildTravelTitle,
  getApplicableItems,
  parseTravelContext,
} from "@/lib/travel-plan";
import { getTravelChecklistId } from "@/lib/travel-checklist-template";
import { getTravelChecklistTemplate } from "@/actions/travel-checklist-settings";
import type { Entry } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/boards");
  revalidatePath("/schedule");
  revalidatePath("/todo");
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/categories");
}

export async function createTravelPlan(input: {
  content: string;
  categoryId: string;
  destination: string;
  departureDate: string | null;
  season: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const ctx = parseTravelContext(
    input.content,
    input.destination,
    input.departureDate ? new Date(input.departureDate) : null,
  );
  if (!ctx) throw new Error("여행 정보를 파싱할 수 없습니다.");

  const template = await getTravelChecklistTemplate();
  const planId = crypto.randomUUID();
  const title = buildTravelTitle(ctx);
  const scheduleContent = input.content.trim() || title;
  const applicable = getApplicableItems(ctx, template);

  const { data: existingEntries } = await supabase
    .from("entries")
    .select("*")
    .eq("is_deleted", false)
    .in("type", ["todo", "checklist"]);

  const existing = (existingEntries ?? []) as Entry[];

  const { error: planError } = await supabase.from("entries").insert({
    user_id: user.id,
    content: scheduleContent,
    type: "schedule",
    category_id: input.categoryId,
    due_at: ctx.departureDate?.toISOString() ?? null,
    status: "active",
    space: "personal",
    metadata: {
      ...buildTravelMetadata(ctx.destination, null),
      travelPlan: true,
      travelPlanId: planId,
      season: ctx.season,
    },
  });

  if (planError) throw new Error(planError.message);

  const todoInserts = applicable
    .filter(({ item }) => {
      const already = existing.find((entry) => {
        const id = getTravelChecklistId(entry.metadata ?? {});
        if (id !== item.id) return false;
        const dest = entry.metadata?.destination;
        return typeof dest === "string" && dest === ctx.destination;
      });
      return !already;
    })
    .map(({ item, groupName }) => ({
      user_id: user.id,
      content: item.label,
      type: "todo" as const,
      category_id: input.categoryId,
      due_at: ctx.departureDate?.toISOString() ?? null,
      status: "active" as const,
      space: "personal" as const,
      metadata: {
        destination: ctx.destination,
        travelPlanId: planId,
        travelChecklistId: item.id,
        travelChecklistGroup: groupName,
        season: ctx.season,
        fromTravelChecklist: true,
      },
    }));

  if (todoInserts.length > 0) {
    const { error: todoError } = await supabase.from("entries").insert(todoInserts);
    if (todoError) throw new Error(todoError.message);
  }

  revalidateAll();
  return { planId, createdCount: todoInserts.length };
}

export async function getActiveTravelPlans() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select("*, categories(*)")
    .eq("is_deleted", false)
    .eq("status", "active")
    .eq("type", "schedule")
    .eq("space", "personal")
    .order("due_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).filter(
    (entry) => entry.metadata?.travelPlan === true,
  );
}

export async function createTravelPlanFromEntry(
  entryId: string,
  travelCategoryId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: entry, error: fetchError } = await supabase
    .from("entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (fetchError || !entry) throw new Error("항목을 찾을 수 없습니다.");

  const ctx = parseTravelContext(
    entry.content,
    null,
    entry.due_at ? new Date(entry.due_at) : null,
  );
  if (!ctx) throw new Error("여행 정보를 파싱할 수 없습니다.");

  return createTravelPlan({
    content: entry.content,
    categoryId: travelCategoryId,
    destination: ctx.destination,
    departureDate: ctx.departureDate?.toISOString() ?? entry.due_at ?? null,
    season: ctx.season,
  });
}
