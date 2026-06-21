"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isSpace,
  SPACE_COOKIE,
  type Space,
} from "@/lib/spaces";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function getActiveSpace(): Promise<Space> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SPACE_COOKIE)?.value;
  if (isSpace(fromCookie)) return fromCookie;

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
export async function setActiveSpace(space: Space) {
  if (!isSpace(space)) throw new Error("잘못된 공간입니다.");

  const cookieStore = await cookies();
  cookieStore.set(SPACE_COOKIE, space, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidateAll();
}

/** 다른 기기 동기화용 — UI에서 await 하지 않고 호출 */
export async function persistActiveSpace(space: Space) {
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
