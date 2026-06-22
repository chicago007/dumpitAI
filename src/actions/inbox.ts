"use server";

import { revalidatePath } from "next/cache";
import { createBoardWithWizard } from "@/actions/boards";
import { getActiveSpace } from "@/actions/space";
import { classifyWithAI, inferProjectType } from "@/lib/ai-classify";
import {
  classifyWithRules,
} from "@/lib/ai-classify-fallback";
import type {
  AiInboxClassification,
  InboxLog,
  InboxProcessResult,
} from "@/lib/ai-inbox-types";
import { createClient } from "@/lib/supabase/server";
import type { Category, Space } from "@/lib/types";

function revalidateInboxPaths() {
  revalidatePath("/inbox");
  revalidatePath("/");
  revalidatePath("/todo");
  revalidatePath("/schedule");
  revalidatePath("/memo");
  revalidatePath("/boards");
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

async function classifyInboxInput(
  text: string,
  categories: Category[],
): Promise<AiInboxClassification> {
  try {
    return await classifyWithAI(text);
  } catch {
    return classifyWithRules(text, categories);
  }
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

export async function processInboxInput(
  text: string,
): Promise<InboxProcessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const space = await getActiveSpace();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("입력 내용이 비어 있습니다.");

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("*")
    .eq("space", space)
    .eq("is_deleted", false);

  if (catError) throw new Error(catError.message);
  const categoryList = (categories ?? []) as Category[];

  const classification = await classifyInboxInput(trimmed, categoryList);
  const defaultCategory = pickDefaultCategory(categoryList, space);
  if (!defaultCategory) {
    throw new Error("카테고리가 없습니다. 설정에서 확인해 주세요.");
  }

  let boardId: string | null = null;
  if (classification.project) {
    const projectType = inferProjectType(classification.project);
    boardId = await createBoardWithWizard({
      name: classification.project,
      space,
      projectType,
      defaultCategoryId: defaultCategory.id,
      skipItems: true,
    });
  }

  const created = { todos: 0, schedules: 0, notes: 0 };

  for (const todo of classification.todos) {
    await insertEntry(supabase, user.id, {
      content: todo,
      type: "todo",
      categoryId: defaultCategory.id,
      boardId,
      dueAt: null,
      space,
    });
    created.todos += 1;
  }

  for (const schedule of classification.schedules) {
    await insertEntry(supabase, user.id, {
      content: schedule.title,
      type: "schedule",
      categoryId: defaultCategory.id,
      boardId,
      dueAt: schedule.start_date,
      space,
    });
    created.schedules += 1;
  }

  for (const note of classification.notes) {
    await insertEntry(supabase, user.id, {
      content: note,
      type: "memo",
      categoryId: defaultCategory.id,
      boardId,
      dueAt: null,
      space,
    });
    created.notes += 1;
  }

  const { data: log, error: logError } = await supabase
    .from("inbox_logs")
    .insert({
      user_id: user.id,
      original_text: trimmed,
      ai_result: classification as unknown as Record<string, unknown>,
      space,
    })
    .select("id")
    .single();

  if (logError) throw new Error(logError.message);

  revalidateInboxPaths();

  return {
    logId: log.id,
    classification,
    boardId,
    created,
  };
}

export async function previewInboxClassification(
  text: string,
): Promise<AiInboxClassification> {
  return classifyWithAI(text);
}
