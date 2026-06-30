import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  findTemplateItemByLabel,
  getTravelChecklistId,
  isTemplateEntry,
} from "@/lib/travel-checklist-template";

/** 여행 표 항목과 일치하는 모든 엔트리를 여행 카테고리·체크리스트로 맞춤 (렌더 중 호출 가능) */
export async function syncTravelChecklistEntries(travelCategoryId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return;

  const { data: entries, error } = await supabase
    .from("entries")
    .select("*")
    .eq("is_deleted", false);

  if (error) throw new Error(error.message);
  if (!entries?.length) return;

  for (const entry of entries) {
    if (!isTemplateEntry(entry)) continue;

    const templateMatch = findTemplateItemByLabel(entry.content);
    const metadata = { ...(entry.metadata ?? {}) };

    if (templateMatch && !getTravelChecklistId(metadata)) {
      metadata.travelChecklistId = templateMatch.item.id;
      metadata.travelChecklistGroup = templateMatch.groupName;
    }

    const needsUpdate =
      entry.category_id !== travelCategoryId ||
      (templateMatch && !getTravelChecklistId(entry.metadata ?? {}));

    if (!needsUpdate) continue;

    const { error: updateError } = await supabase
      .from("entries")
      .update({
        category_id: travelCategoryId,
        metadata,
      })
      .eq("id", entry.id);

    if (updateError) throw new Error(updateError.message);
  }
}
