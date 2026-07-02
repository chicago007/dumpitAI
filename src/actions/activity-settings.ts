"use server";

import {
  buildActivityCatalog,
  createCustomActivityKey,
  isValidCustomActivityTypes,
  pickCustomActivityColor,
  type CustomActivityType,
} from "@/lib/activity-catalog";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { isMissingDbColumnError, isSchemaSetupError } from "@/lib/supabase/errors";
import { revalidateActivityPaths } from "@/lib/revalidate";

export async function getCustomActivityTypes(): Promise<CustomActivityType[]> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("user_settings")
      .select("custom_activity_types")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      if (
        isSchemaSetupError(error) ||
        isMissingDbColumnError(error, "custom_activity_types")
      ) {
        return [];
      }
      throw new Error(error.message);
    }

    const saved = data?.custom_activity_types;
    if (isValidCustomActivityTypes(saved)) return saved;

    return [];
  } catch (error) {
    if (
      isSchemaSetupError(error) ||
      isMissingDbColumnError(error, "custom_activity_types")
    ) {
      return [];
    }
    throw error;
  }
}

async function saveCustomActivityTypes(types: CustomActivityType[]) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      custom_activity_types: types,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    if (isSchemaSetupError(error)) {
      throw new Error(
        "user_settings에 custom_activity_types가 없습니다. Supabase에서 014_activity_custom_types.sql을 실행해 주세요.",
      );
    }
    throw new Error(error.message);
  }

  revalidateActivityPaths();
}

export async function addCustomActivityType(label: string) {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("활동 이름을 입력해 주세요.");
  if (trimmed.length > 20) throw new Error("활동 이름은 20자 이하로 입력해 주세요.");

  const existing = await getCustomActivityTypes();
  const duplicate = existing.find(
    (t) => t.label.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (duplicate) throw new Error("이미 등록된 활동입니다.");

  const key = createCustomActivityKey(trimmed);
  if (existing.some((t) => t.key === key)) {
    throw new Error("같은 이름의 활동이 이미 있습니다.");
  }

  const next: CustomActivityType[] = [
    ...existing,
    {
      key,
      label: trimmed,
      color: pickCustomActivityColor(existing.length),
    },
  ];

  await saveCustomActivityTypes(next);
  return key;
}

export async function removeCustomActivityType(key: string) {
  const existing = await getCustomActivityTypes();
  const next = existing.filter((t) => t.key !== key);
  if (next.length === existing.length) {
    throw new Error("활동을 찾을 수 없습니다.");
  }
  await saveCustomActivityTypes(next);
}

export async function getActivityCatalogForUser() {
  const customTypes = await getCustomActivityTypes();
  return buildActivityCatalog(customTypes);
}
