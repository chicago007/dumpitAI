"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isSpace,
  isViewSpace,
  SPACE_COOKIE,
  type Space,
  type ViewSpace,
} from "@/lib/spaces";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function getActiveSpace(): Promise<ViewSpace> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SPACE_COOKIE)?.value;
  if (isViewSpace(fromCookie)) return fromCookie;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "personal";

    const { data } = await supabase
      .from("user_settings")
      .select("active_space")
      .eq("user_id", user.id)
      .maybeSingle();

    if (isSpace(data?.active_space)) return data.active_space;
  } catch {
    return "personal";
  }

  return "personal";
}

/** 쿠키 + 레이아웃 갱신만 (빠른 전환) */
export async function setActiveSpace(space: ViewSpace) {
  if (!isViewSpace(space)) throw new Error("잘못된 공간입니다.");

  const cookieStore = await cookies();
  cookieStore.set(SPACE_COOKIE, space, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidateAll();
}

/** 다른 기기 동기화용 — 전체(all)는 쿠키만, DB에는 업무/개인만 */
export async function persistActiveSpace(space: ViewSpace) {
  if (!isSpace(space)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("user_settings").upsert({
    user_id: user.id,
    active_space: space,
    updated_at: new Date().toISOString(),
  });
}
