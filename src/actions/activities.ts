"use server";

import { getActiveSpace } from "@/actions/space";
import { getCustomActivityTypes } from "@/actions/activity-settings";
import {
  activityTypeForKey,
  isBuiltinActivityKey,
} from "@/lib/activity-catalog";
import { parseActivityInput } from "@/lib/activity-input";
import type { ActivityLog, CreateActivityLogInput } from "@/lib/activity-types";
import { resolveActivityKey } from "@/lib/activity-types";
import { getSeoulDayBounds } from "@/lib/dates";
import { revalidateActivityPaths } from "@/lib/revalidate";
import { isMissingDbColumnError } from "@/lib/supabase/errors";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { Space, ViewSpace } from "@/lib/spaces";
import { z } from "zod";

const createActivityLogSchema = z.object({
  activityKey: z.string().min(1).max(64),
  content: z.string().max(500).optional(),
  loggedAt: z.string().max(64).optional(),
  durationMin: z.number().int().min(0).max(24 * 60).nullable().optional(),
  quantity: z.number().min(0).max(1_000_000).nullable().optional(),
  unit: z.string().max(32).nullable().optional(),
  space: z.enum(["work", "personal"]).optional(),
});

function resolveSpace(viewSpace: ViewSpace, inputSpace?: Space): Space {
  if (viewSpace !== "all") return viewSpace;
  if (inputSpace) return inputSpace;
  return "personal";
}

function getWeekStart(date = new Date()) {
  const { startKey } = getSeoulDayBounds(date);
  const anchor = new Date(`${startKey}T12:00:00+09:00`);
  const day = anchor.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  anchor.setUTCDate(anchor.getUTCDate() + mondayOffset);
  const mondayKey = anchor.toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });
  return new Date(`${mondayKey}T00:00:00+09:00`);
}

export interface ActivityWeekStat {
  activityKey: string;
  count: number;
  totalDurationMin: number;
  totalQuantity: number;
  unit: string | null;
}

export async function getActivityLogs(
  space?: ViewSpace,
  limit = 50,
): Promise<ActivityLog[]> {
  const supabase = await createClient();
  const viewSpace = space ?? (await getActiveSpace());

  let query = supabase
    .from("activity_logs")
    .select("*")
    .eq("is_deleted", false)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (viewSpace !== "all") {
    query = query.eq("space", viewSpace);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityLog[];
}

export async function getActivityWeekStats(
  space?: ViewSpace,
): Promise<ActivityWeekStat[]> {
  const supabase = await createClient();
  const viewSpace = space ?? (await getActiveSpace());
  const weekStart = getWeekStart();

  let query = supabase
    .from("activity_logs")
    .select("activity_type, duration_min, quantity, unit")
    .eq("is_deleted", false)
    .gte("logged_at", weekStart.toISOString());

  if (viewSpace !== "all") {
    query = query.eq("space", viewSpace);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const map = new Map<string, ActivityWeekStat>();

  for (const row of data ?? []) {
    const key = row.activity_type as string;
    const stat = map.get(key) ?? {
      activityKey: key,
      count: 0,
      totalDurationMin: 0,
      totalQuantity: 0,
      unit: null,
    };
    stat.count += 1;
    stat.totalDurationMin += row.duration_min ?? 0;
    if (row.quantity != null) {
      stat.totalQuantity += Number(row.quantity);
      stat.unit = row.unit ?? stat.unit;
    }
    map.set(key, stat);
  }

  return [...map.values()];
}

export async function getActivityWeekCount(space?: ViewSpace): Promise<number> {
  const stats = await getActivityWeekStats(space);
  return stats.reduce((sum, s) => sum + s.count, 0);
}

export async function createActivityLog(input: CreateActivityLogInput) {
  const parsed = createActivityLogSchema.parse(input);
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const viewSpace = await getActiveSpace();
  const space = resolveSpace(viewSpace, parsed.space);
  const activityType = activityTypeForKey(parsed.activityKey);

  const payload = {
    user_id: user.id,
    space,
    activity_type: activityType,
    content: parsed.content?.trim() ?? "",
    logged_at: parsed.loggedAt ?? new Date().toISOString(),
    duration_min: parsed.durationMin ?? null,
    quantity: parsed.quantity ?? null,
    unit: parsed.unit ?? null,
  };

  let { data, error } = await supabase
    .from("activity_logs")
    .insert({ ...payload, activity_key: parsed.activityKey })
    .select("id")
    .single();

  if (error && isMissingDbColumnError(error, "activity_key")) {
    if (!isBuiltinActivityKey(parsed.activityKey)) {
      throw new Error(
        "커스텀 활동을 쓰려면 Supabase에서 014_activity_custom_types.sql을 실행해 주세요.",
      );
    }

    ({ data, error } = await supabase
      .from("activity_logs")
      .insert({
        ...payload,
        activity_type: parsed.activityKey,
      })
      .select("id")
      .single());
  }

  if (error) throw new Error(error.message);
  if (!data) throw new Error("저장에 실패했습니다.");
  revalidateActivityPaths();
  return data.id as string;
}

export async function matchActivityInput(text: string) {
  const customTypes = await getCustomActivityTypes();
  return parseActivityInput(text.trim(), customTypes);
}

export async function createActivityFromText(text: string) {
  const parsed = await matchActivityInput(text);
  if (!parsed) {
    const customTypes = await getCustomActivityTypes();
    const customHint =
      customTypes.length > 0
        ? `, ${customTypes.map((t) => t.label).slice(0, 3).join("/")}`
        : "";
    throw new Error(
      `형식을 인식하지 못했습니다. 예: 독서 30분, 러닝 5km${customHint}`,
    );
  }

  return createActivityLog({
    activityKey: parsed.activityKey,
    content: parsed.content,
    durationMin: parsed.durationMin,
    quantity: parsed.quantity,
    unit: parsed.unit,
  });
}

/** 여러 줄 입력에서 활동 줄만 먼저 저장하고 나머지 텍스트를 반환 */
export async function extractAndSaveActivities(text: string) {
  const lines = text.split("\n");
  const remaining: string[] = [];
  let savedCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsed = await matchActivityInput(trimmed);
    if (parsed) {
      await createActivityLog({
        activityKey: parsed.activityKey,
        content: parsed.content,
        durationMin: parsed.durationMin,
        quantity: parsed.quantity,
        unit: parsed.unit,
      });
      savedCount += 1;
    } else {
      remaining.push(line);
    }
  }

  return {
    remainingText: remaining.join("\n").trim(),
    savedCount,
  };
}

export async function deleteActivityLog(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("activity_logs")
    .update({ is_deleted: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidateActivityPaths();
}

export { resolveActivityKey };
