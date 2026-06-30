"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  APPEARANCE_THEME_COOKIE,
  isAppearanceThemeId,
  type AppearanceThemeId,
} from "@/lib/appearance-themes";

const DEFAULT_THEME: AppearanceThemeId = "default";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function getAppearanceTheme(): Promise<AppearanceThemeId> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(APPEARANCE_THEME_COOKIE)?.value;
  if (isAppearanceThemeId(fromCookie)) return fromCookie;

  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return DEFAULT_THEME;

    const { data } = await supabase
      .from("user_settings")
      .select("appearance_theme")
      .eq("user_id", user.id)
      .maybeSingle();

    if (isAppearanceThemeId(data?.appearance_theme)) {
      return data.appearance_theme;
    }
  } catch {
    return DEFAULT_THEME;
  }

  return DEFAULT_THEME;
}

export async function setAppearanceTheme(theme: AppearanceThemeId) {
  if (!isAppearanceThemeId(theme)) {
    throw new Error("잘못된 테마입니다.");
  }

  const cookieStore = await cookies();
  cookieStore.set(APPEARANCE_THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidateAll();
}

export async function persistAppearanceTheme(theme: AppearanceThemeId) {
  if (!isAppearanceThemeId(theme)) return;

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    appearance_theme: theme,
    updated_at: new Date().toISOString(),
  });

  if (error) return;
}
