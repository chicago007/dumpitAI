"use server";

import {
  applyBoardPreviewItem,
  createBoardWithWizard,
  getBoard,
} from "@/actions/boards";
import { getActiveSpace } from "@/actions/space";
import { revalidateAppData } from "@/lib/revalidate";
import { inferProjectType } from "@/lib/ai-classify";
import type {
  InboxPreviewItem,
  InboxPreviewResult,
  InboxLog,
  InboxProcessResult,
} from "@/lib/ai-inbox-types";
import {
  buildInboxPreview,
  previewToClassification,
} from "@/lib/inbox-classify";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  inboxPreviewSchema,
  inboxTextSchema,
  parseOrThrow,
} from "@/lib/validation";
import type { Category, Space } from "@/lib/types";
import type { ViewSpace } from "@/lib/spaces";
import { parseSpaceLinePrefix } from "@/lib/space-input";

function pickDefaultCategory(categories: Category[], space: Space) {
  const preferred = space === "work" ? "업무" : "기타";
  return (
    categories.find((c) => c.name === preferred && c.space === space) ??
    categories.find((c) => c.space === space && !c.is_deleted) ??
    categories.find((c) => c.space === space) ??
    categories[0]
  );
}

async function loadCategoriesBySpace(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<Space, Category[]>> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_deleted", false);

  if (error) throw new Error(error.message);

  const map = new Map<Space, Category[]>([
    ["work", []],
    ["personal", []],
  ]);

  for (const cat of (data ?? []) as Category[]) {
    map.get(cat.space)?.push(cat);
  }

  return map;
}

async function insertEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: {
    content: string;
    type: "todo" | "schedule" | "memo";
    categoryId: string;
    boardId: string | null;
    dueAt: string | null;
    space: Space;
  },
) {
  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: userId,
      content: input.content,
      type: input.type,
      category_id: input.categoryId,
      board_id: input.boardId,
      due_at: input.dueAt,
      status: "active",
      space: input.space,
      metadata: {},
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function rollbackInboxSave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  boardId: string | null,
  entryIds: string[],
) {
  if (entryIds.length > 0) {
    await supabase
      .from("entries")
      .update({ is_deleted: true })
      .in("id", entryIds);
  }
  if (boardId) {
    await supabase.rpc("delete_board_atomic", { p_board_id: boardId });
  }
}

function countCreated(
  items: InboxPreviewItem[],
): InboxProcessResult["created"] {
  const created = {
    todos: 0,
    schedules: 0,
    notes: 0,
    checklist: 0,
    budget: 0,
    expense: 0,
  };

  for (const item of items) {
    switch (item.kind) {
      case "todo":
        created.todos += 1;
        break;
      case "schedule":
        created.schedules += 1;
        break;
      case "memo":
        created.notes += 1;
        break;
      case "checklist":
        created.checklist += 1;
        break;
      case "budget":
        created.budget += 1;
        break;
      case "expense":
        created.expense += 1;
        break;
      case "period":
        break;
    }
  }

  return created;
}

function resolveProjectSpace(
  preview: InboxPreviewResult,
  viewSpace: ViewSpace,
): Space | null {
  const fromItem = preview.items[0]?.targetSpace;
  if (fromItem) return fromItem;

  if (viewSpace !== "all") return viewSpace;

  for (const line of preview.originalText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = parseSpaceLinePrefix(trimmed, "personal");
    if ("error" in parsed) continue;
    if (parsed.hadPrefix) return parsed.targetSpace;
  }

  if (preview.isProjectBlock && preview.project) {
    if (preview.suggestedSpace) return preview.suggestedSpace;
    if (viewSpace !== "all") return viewSpace;
    return "personal";
  }

  return null;
}

export async function getInboxLogs(limit = 20): Promise<InboxLog[]> {
  const supabase = await createClient();
  const viewSpace = await getActiveSpace();

  let query = supabase
    .from("inbox_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (viewSpace !== "all") {
    query = query.eq("space", viewSpace);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as InboxLog[];
}

/** 한 줄 입력은 바로 저장(공간 확인 필요 시 미리보기), 여러 줄은 미리보기 후 저장 */
export async function quickSaveInboxInput(
  text: string,
): Promise<InboxProcessResult> {
  const preview = await previewInboxInput(text);
  if (preview.needsSpaceConfirm) {
    throw new Error("공간 확인이 필요합니다.");
  }
  return saveInboxPreview(preview);
}

/** 1단계: 분류 미리보기 (저장 안 함) */
export async function previewInboxInput(
  text: string,
): Promise<InboxPreviewResult> {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const trimmed = parseOrThrow(inboxTextSchema, text);

  const viewSpace = await getActiveSpace();
  const result = await buildInboxPreview(trimmed, viewSpace, user.id);
  return result;
}

/** 2단계: 미리보기 확인 후 저장 */
export async function saveInboxPreview(
  preview: InboxPreviewResult,
): Promise<InboxProcessResult> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const validated = parseOrThrow(
    inboxPreviewSchema,
    preview,
  ) as InboxPreviewResult;

  const viewSpace = await getActiveSpace();
  const categoriesBySpace = await loadCategoriesBySpace(supabase);

  function defaultCategoryFor(space: Space) {
    const list = categoriesBySpace.get(space) ?? [];
    const cat = pickDefaultCategory(list, space);
    if (!cat) {
      throw new Error(
        `${space === "work" ? "업무" : "개인"} 카테고리가 없습니다.`,
      );
    }
    return cat;
  }

  let boardId: string | null = null;
  const createdEntryIds: string[] = [];

  try {
    const projectSpace = resolveProjectSpace(validated, viewSpace);

    if (validated.project && projectSpace) {
      const projectType =
        projectSpace === "work"
          ? inferProjectType(validated.project, "work")
          : inferProjectType(validated.project);
      const defaultCategory = defaultCategoryFor(projectSpace);
      const useTemplateItems =
        validated.isProjectBlock && validated.items.length === 0;

      boardId = await createBoardWithWizard({
        name: validated.project,
        space: projectSpace,
        projectType,
        defaultCategoryId: defaultCategory.id,
        skipItems: !useTemplateItems,
      });
    }

    const created = countCreated(validated.items);

    if (validated.isProjectBlock && boardId && projectSpace) {
      const board = await getBoard(boardId);
      const metadata = (board?.metadata ?? {}) as {
        checklistGroups?: { id: string }[];
      };
      const defaultGroupId = metadata.checklistGroups?.[0]?.id;
      const defaultCategory = defaultCategoryFor(projectSpace);

      for (const item of validated.items) {
        await applyBoardPreviewItem(
          boardId,
          item,
          defaultCategory.id,
          defaultGroupId,
        );
      }
    } else {
      for (const item of validated.items) {
        const defaultCategory = defaultCategoryFor(item.targetSpace);

        if (item.kind === "todo") {
          const id = await insertEntry(supabase, user.id, {
            content: item.content,
            type: "todo",
            categoryId: defaultCategory.id,
            boardId:
              boardId && item.targetSpace === projectSpace ? boardId : null,
            dueAt: item.dueAt,
            space: item.targetSpace,
          });
          createdEntryIds.push(id);
        } else if (item.kind === "schedule") {
          const id = await insertEntry(supabase, user.id, {
            content: item.content,
            type: "schedule",
            categoryId: defaultCategory.id,
            boardId:
              boardId && item.targetSpace === projectSpace ? boardId : null,
            dueAt: item.dueAt,
            space: item.targetSpace,
          });
          createdEntryIds.push(id);
        } else if (item.kind === "memo") {
          const id = await insertEntry(supabase, user.id, {
            content: item.content,
            type: "memo",
            categoryId: defaultCategory.id,
            boardId:
              boardId && item.targetSpace === projectSpace ? boardId : null,
            dueAt: null,
            space: item.targetSpace,
          });
          createdEntryIds.push(id);
        } else if (boardId && item.targetSpace === projectSpace) {
          await applyBoardPreviewItem(boardId, item, defaultCategory.id);
        }
      }
    }

    const classification = previewToClassification(validated);
    const logSpace: Space =
      projectSpace ??
      (viewSpace !== "all"
        ? viewSpace
        : (validated.items[0]?.targetSpace ?? "personal"));

    const { data: log, error: logError } = await supabase
      .from("inbox_logs")
      .insert({
        user_id: user.id,
        original_text: validated.originalText,
        ai_result: classification as unknown as Record<string, unknown>,
        space: logSpace,
      })
      .select("id")
      .single();

    if (logError) throw new Error(logError.message);

    revalidateAppData(boardId);

    return {
      logId: log.id,
      classification,
      boardId,
      created,
    };
  } catch (err) {
    await rollbackInboxSave(supabase, boardId, createdEntryIds);
    throw err;
  }
}

/** @deprecated previewInboxInput + saveInboxPreview 사용 */
export async function processInboxInput(
  text: string,
): Promise<InboxProcessResult> {
  const preview = await previewInboxInput(text);
  return saveInboxPreview(preview);
}
