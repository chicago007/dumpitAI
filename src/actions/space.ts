"use server";

import { cache } from "react";
import { cookies } from "next/headers";
import { revalidateAppLayout } from "@/lib/revalidate";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  isSpace,
  isViewSpace,
  SPACE_COOKIE,
  type Space,
  type ViewSpace,
} from "@/lib/spaces";

const SPACE_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
};

/**
 * 요청 단위로 메모이즈 — 레이아웃·페이지·여러 액션이 같은 렌더에서
 * 반복 호출해도 쿠키/DB 조회는 한 번만 수행한다.
 *
 * 업무/개인은 DB(user_settings)를 우선해 기기 간 목록이 어긋나지 않게 한다.
 * "전체" 보기는 기기별 쿠키만 사용한다.
 */
const readActiveSpace = cache(async (): Promise<ViewSpace> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SPACE_COOKIE)?.value;

  if (fromCookie === "all") return "all";

  let fromDb: Space | null = null;
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (user) {
      const { data } = await supabase
        .from("user_settings")
        .select("active_space")
        .eq("user_id", user.id)
        .maybeSingle();

      if (isSpace(data?.active_space)) fromDb = data.active_space;
    }
  } catch {
    // DB 조회 실패 시 쿠키/기본값으로 폴백
  }

  if (fromDb) {
    if (fromCookie !== fromDb) {
      cookieStore.set(SPACE_COOKIE, fromDb, SPACE_COOKIE_OPTIONS);
    }
    return fromDb;
  }

  if (isViewSpace(fromCookie)) return fromCookie;
  return "personal";
});

export async function getActiveSpace(): Promise<ViewSpace> {
  return readActiveSpace();
}

/** 쿠키 + 레이아웃 갱신만 (빠른 전환) */
export async function setActiveSpace(space: ViewSpace) {
  if (!isViewSpace(space)) throw new Error("잘못된 공간입니다.");

  const cookieStore = await cookies();
  cookieStore.set(SPACE_COOKIE, space, SPACE_COOKIE_OPTIONS);

  revalidateAppLayout();
}

/** 다른 기기 동기화용 — 전체(all)는 쿠키만, DB에는 업무/개인만 */
export async function persistActiveSpace(space: ViewSpace) {
  if (!isSpace(space)) return;

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return;

  await supabase.from("user_settings").upsert({
    user_id: user.id,
    active_space: space,
    updated_at: new Date().toISOString(),
  });
}
