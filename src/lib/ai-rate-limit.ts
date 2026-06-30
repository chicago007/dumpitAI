import { createClient } from "@/lib/supabase/server";
import { getSeoulTodayKey } from "@/lib/dates";

const DEFAULT_DAILY_LIMIT = 200;

function getDailyLimit() {
  const fromEnv = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(fromEnv) && fromEnv > 0
    ? fromEnv
    : DEFAULT_DAILY_LIMIT;
}

/** 사용자별 일일 Gemini 호출 한도 (서울 날짜 기준) */
export async function assertAiRateLimit(userId: string) {
  const supabase = await createClient();
  const usageDate = getSeoulTodayKey();
  const limit = getDailyLimit();

  const { data: row, error: fetchError } = await supabase
    .from("ai_usage_daily")
    .select("call_count")
    .eq("user_id", userId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  if (fetchError) {
    console.error("[ai-rate-limit] fetch failed:", fetchError.message);
    return;
  }

  const count = row?.call_count ?? 0;
  if (count >= limit) {
    throw new Error(
      `오늘 AI 사용 한도(${limit}회)를 초과했습니다. 내일 다시 시도해 주세요.`,
    );
  }

  const { error: upsertError } = await supabase.from("ai_usage_daily").upsert(
    {
      user_id: userId,
      usage_date: usageDate,
      call_count: count + 1,
    },
    { onConflict: "user_id,usage_date" },
  );

  if (upsertError) {
    console.error("[ai-rate-limit] upsert failed:", upsertError.message);
  }
}
