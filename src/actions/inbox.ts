"use server";

import { revalidatePath } from "next/cache";
import {
  applyBoardPreviewItem,
  createBoardWithWizard,
  getBoard,
} from "@/actions/boards";
import { getActiveSpace } from "@/actions/space";
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
import { createClient } from "@/lib/supabase/server";
import type { Category, Space } from "@/lib/types";

function revalidateInboxPaths(boardId?: string | null) {
  revalidatePath("/inbox");
  revalidatePath("/");
  revalidatePath("/todo");
  revalidatePath("/schedule");
  revalidatePath("/memo");
  revalidatePath("/boards");
  if (boardId) revalidatePath(`/boards/${boardId}`);
}

function pickDefaultCategory(categories: Category[], space: Space) {
  const preferred = space === "work" ? "업무" : "기타";
  return (
    categories.find((c) => c.name === preferred) ??
    categories.find((c) => !c.is_deleted) ??
    categories[0]
  );
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
  const { error } = await supabase.from("entries").insert({
    user_id: userId,
    content: input.content,
    type: input.type,
    category_id: input.categoryId,
    board_id: input.boardId,
    due_at: input.dueAt,
    status: "active",
    space: input.space,
    metadata: {},
  });
  if (error) throw new Error(error.message);
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
    }
  }

  return created;
}

export async function getInboxLogs(limit = 20): Promise<InboxLog[]> {
  const supabase = await createClient();
  const space = await getActiveSpace();

  const { data, error } = await supabase
    .from("inbox_logs")
    .select("*")
    .eq("space", space)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as InboxLog[];
}

/** 1단계: 분류 미리보기 (저장 안 함) */
export async function previewInboxInput(
  text: string,
): Promise<InboxPreviewResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const trimmed = text.trim();
  if (!trimmed) throw new Error("입력 내용이 비어 있습니다.");

  return buildInboxPreview(trimmed);
}

/** 2단계: 미리보기 확인 후 저장 */
export async function saveInboxPreview(
  preview: InboxPreviewResult,
): Promise<InboxProcessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const space = await getActiveSpace();
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("*")
    .eq("space", space)
    .eq("is_deleted", false);

  if (catError) throw new Error(catError.message);
  const categoryList = (categories ?? []) as Category[];
  const defaultCategory = pickDefaultCategory(categoryList, space);
  if (!defaultCategory) {
    throw new Error("카테고리가 없습니다. 설정에서 확인해 주세요.");
  }

  let boardId: string | null = null;
  if (preview.project) {
    const projectType = inferProjectType(preview.project);
    boardId = await createBoardWithWizard({
      name: preview.project,
      space,
      projectType,
      defaultCategoryId: defaultCategory.id,
      skipItems: true,
    });
  }

  const created = countCreated(preview.items);

  if (preview.isProjectBlock && boardId) {
    const board = await getBoard(boardId);
    const metadata = (board?.metadata ?? {}) as {
      checklistGroups?: { id: string }[];
    };
    const defaultGroupId = metadata.checklistGroups?.[0]?.id;

    for (const item of preview.items) {
      await applyBoardPreviewItem(
        boardId,
        item,
        defaultCategory.id,
        defaultGroupId,
      );
    }
  } else {
    for (const item of preview.items) {
      if (item.kind === "todo") {
        await insertEntry(supabase, user.id, {
          content: item.content,
          type: "todo",
          categoryId: defaultCategory.id,
          boardId,
          dueAt: item.dueAt,
          space,
        });
      } else if (item.kind === "schedule") {
        await insertEntry(supabase, user.id, {
          content: item.content,
          type: "schedule",
          categoryId: defaultCategory.id,
          boardId,
          dueAt: item.dueAt,
          space,
        });
      } else if (item.kind === "memo") {
        await insertEntry(supabase, user.id, {
          content: item.content,
          type: "memo",
          categoryId: defaultCategory.id,
          boardId,
          dueAt: null,
          space,
        });
      } else if (boardId) {
        await applyBoardPreviewItem(
          boardId,
          item,
          defaultCategory.id,
        );
      }
    }
  }

  const classification = previewToClassification(preview);

  const { data: log, error: logError } = await supabase
    .from("inbox_logs")
    .insert({
      user_id: user.id,
      original_text: preview.originalText,
      ai_result: classification as unknown as Record<string, unknown>,
      space,
    })
    .select("id")
    .single();

  if (logError) throw new Error(logError.message);

  revalidateInboxPaths(boardId);

  return {
    logId: log.id,
    classification,
    boardId,
    created,
  };
}

/** @deprecated previewInboxInput + saveInboxPreview 사용 */
export async function processInboxInput(
  text: string,
): Promise<InboxProcessResult> {
  const preview = await previewInboxInput(text);
  return saveInboxPreview(preview);
}
