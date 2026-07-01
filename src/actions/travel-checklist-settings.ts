"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { revalidateAppData } from "@/lib/revalidate";
import {
  cloneTemplate,
  DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
  type TravelChecklistGroup,
  type TravelChecklistItem,
} from "@/lib/travel-checklist-template";
import { isSchemaSetupError } from "@/lib/supabase/errors";

import { getProjectTemplate } from "@/lib/board-templates";
import type { Space } from "@/lib/spaces";

function defaultWorkChecklistTemplate(): TravelChecklistGroup[] {
  const groups = getProjectTemplate("work").checklistGroups;
  return groups.map((group) => ({
    name: group.name,
    rows: [
      group.items.map((label, index) => ({
        id: `work-${group.name}-${index}`,
        label,
      })),
    ],
  }));
}

function isValidTemplate(data: unknown): data is TravelChecklistGroup[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (group) =>
      typeof group.name === "string" &&
      Array.isArray(group.rows) &&
      group.rows.every(
        (row: TravelChecklistItem[]) =>
          Array.isArray(row) &&
          row.every(
            (item: TravelChecklistItem) =>
              typeof item.id === "string" &&
              typeof item.label === "string" &&
              item.label.trim().length > 0,
          ),
      ),
  );
}

export async function getTravelChecklistTemplate(): Promise<TravelChecklistGroup[]> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return cloneTemplate();

    const { data, error } = await supabase
      .from("user_settings")
      .select("travel_checklist_template")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      if (isSchemaSetupError(error)) return cloneTemplate();
      throw new Error(error.message);
    }

    const saved = data?.travel_checklist_template;
    if (isValidTemplate(saved)) return saved as TravelChecklistGroup[];

    return cloneTemplate();
  } catch (error) {
    if (isSchemaSetupError(error)) return cloneTemplate();
    throw error;
  }
}

export async function saveTravelChecklistTemplate(
  template: TravelChecklistGroup[],
) {
  if (!isValidTemplate(template)) {
    throw new Error("체크리스트 형식이 올바르지 않습니다.");
  }

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    travel_checklist_template: template,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (isSchemaSetupError(error)) {
      throw new Error(
        "user_settings 테이블이 없습니다. Supabase에서 003_user_settings.sql을 실행해 주세요.",
      );
    }
    throw new Error(error.message);
  }

  revalidateAppData();
}

export async function resetTravelChecklistTemplate() {
  await saveTravelChecklistTemplate(cloneTemplate(DEFAULT_TRAVEL_CHECKLIST_TEMPLATE));
}

export async function getWorkChecklistTemplate(): Promise<TravelChecklistGroup[]> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return cloneTemplate(defaultWorkChecklistTemplate());

    const { data, error } = await supabase
      .from("user_settings")
      .select("work_checklist_template")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      if (isSchemaSetupError(error)) return cloneTemplate(defaultWorkChecklistTemplate());
      throw new Error(error.message);
    }

    const saved = data?.work_checklist_template;
    if (isValidTemplate(saved)) return saved as TravelChecklistGroup[];

    return cloneTemplate(defaultWorkChecklistTemplate());
  } catch (error) {
    if (isSchemaSetupError(error)) return cloneTemplate(defaultWorkChecklistTemplate());
    throw error;
  }
}

export async function saveWorkChecklistTemplate(
  template: TravelChecklistGroup[],
) {
  if (!isValidTemplate(template)) {
    throw new Error("체크리스트 형식이 올바르지 않습니다.");
  }

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    work_checklist_template: template,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (isSchemaSetupError(error)) {
      throw new Error(
        "user_settings 테이블이 없습니다. Supabase에서 012_work_checklist_template.sql을 실행해 주세요.",
      );
    }
    throw new Error(error.message);
  }

  revalidateAppData();
}

export async function resetWorkChecklistTemplate() {
  await saveWorkChecklistTemplate(cloneTemplate(defaultWorkChecklistTemplate()));
}

export async function getChecklistTemplateForSpace(
  space: Space,
): Promise<TravelChecklistGroup[]> {
  return space === "work"
    ? getWorkChecklistTemplate()
    : getTravelChecklistTemplate();
}
