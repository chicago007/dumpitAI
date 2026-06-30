"use server";

import { getActiveSpace } from "@/actions/space";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { revalidateSettingsPaths, revalidateAppData } from "@/lib/revalidate";
import { categorySpaceFromName, type Space, type ViewSpace } from "@/lib/spaces";
import type { Category } from "@/lib/types";

const WORK_CATEGORIES = [
  {
    name: "업무",
    icon: "💼",
    color: "#3B82F6",
    keywords: ["회의", "보고서", "제출", "프로젝트", "이메일", "미팅", "업무"],
    sort_order: 1,
    is_default: true,
    space: "work" as const,
  },
  {
    name: "학습",
    icon: "🎓",
    color: "#8B5CF6",
    keywords: ["공부", "강의", "시험", "자격증", "학습"],
    sort_order: 2,
    is_default: true,
    space: "work" as const,
  },
  {
    name: "기타",
    icon: "📌",
    color: "#9CA3AF",
    keywords: [] as string[],
    sort_order: 3,
    is_default: true,
    space: "work" as const,
  },
];

const PERSONAL_CATEGORIES = [
  {
    name: "여행",
    icon: "✈️",
    color: "#0EA5E9",
    keywords: ["항공", "호텔", "여권", "제주", "해외", "여행", "비행기"],
    sort_order: 1,
    is_default: true,
    space: "personal" as const,
  },
  {
    name: "독서",
    icon: "📚",
    color: "#92400E",
    keywords: ["책", "읽기", "독서", "페이지", "도서"],
    sort_order: 2,
    is_default: true,
    space: "personal" as const,
  },
  {
    name: "운동",
    icon: "🏋️",
    color: "#EF4444",
    keywords: ["헬스", "러닝", "요가", "PT", "근력", "운동", "헬스장"],
    sort_order: 3,
    is_default: true,
    space: "personal" as const,
  },
  {
    name: "다이어트",
    icon: "🥗",
    color: "#22C55E",
    keywords: ["칼로리", "체중", "식단", "탄수화물", "다이어트"],
    sort_order: 4,
    is_default: true,
    space: "personal" as const,
  },
  {
    name: "생활",
    icon: "🏠",
    color: "#6B7280",
    keywords: ["장보기", "청소", "세탁", "공과금", "생활"],
    sort_order: 5,
    is_default: true,
    space: "personal" as const,
  },
  {
    name: "건강",
    icon: "💊",
    color: "#EC4899",
    keywords: ["병원", "약", "검진", "수면", "건강"],
    sort_order: 6,
    is_default: true,
    space: "personal" as const,
  },
  {
    name: "재정",
    icon: "💰",
    color: "#EAB308",
    keywords: ["저축", "카드", "예산", "투자", "재정", "돈"],
    sort_order: 7,
    is_default: true,
    space: "personal" as const,
  },
  {
    name: "기타",
    icon: "📌",
    color: "#9CA3AF",
    keywords: [] as string[],
    sort_order: 8,
    is_default: true,
    space: "personal" as const,
  },
];

export async function seedDefaultCategoriesIfNeeded() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return;

  const { data: existing } = await supabase
    .from("categories")
    .select("id, space")
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  const spacesPresent = new Set(
    (existing ?? []).map((row) => row.space as Space),
  );

  const toInsert: Array<Record<string, unknown>> = [];

  if (!spacesPresent.has("work")) {
    for (const category of WORK_CATEGORIES) {
      toInsert.push({ user_id: user.id, ...category });
    }
  }

  if (!spacesPresent.has("personal")) {
    for (const category of PERSONAL_CATEGORIES) {
      toInsert.push({ user_id: user.id, ...category });
    }
  }

  if (toInsert.length === 0) return;

  const { error } = await supabase.from("categories").insert(toInsert);
  if (error) throw new Error(error.message);

  revalidateAppData();
  revalidateSettingsPaths();
}

export async function getCategories(space?: ViewSpace) {
  const supabase = await createClient();
  const viewSpace = space ?? (await getActiveSpace());

  let query = supabase
    .from("categories")
    .select("*")
    .eq("is_deleted", false)
    .order("sort_order");

  if (viewSpace !== "all") {
    query = query.eq("space", viewSpace);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function getCategoryById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function createCategory(input: {
  name: string;
  icon: string;
  color: string;
  keywords?: string[];
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const space = await getActiveSpace();

  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("space", space)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: input.name,
    icon: input.icon,
    color: input.color,
    keywords: input.keywords ?? [],
    sort_order: sortOrder,
    is_default: false,
    space,
  });

  if (error) throw new Error(error.message);
  revalidateSettingsPaths();
}

export async function updateCategory(
  id: string,
  input: {
    name: string;
    icon: string;
    color: string;
    keywords: string[];
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      icon: input.icon,
      color: input.color,
      keywords: input.keywords,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateSettingsPaths();
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: category } = await supabase
    .from("categories")
    .select("space")
    .eq("id", id)
    .single();

  const space = (category?.space as Space) ?? "personal";

  const { data: fallback } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "기타")
    .eq("space", space)
    .eq("is_deleted", false)
    .single();

  if (fallback) {
    await supabase
      .from("entries")
      .update({ category_id: fallback.id })
      .eq("category_id", id);
  }

  const { error } = await supabase
    .from("categories")
    .update({ is_deleted: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateSettingsPaths();
}

export async function learnCategoryKeyword(
  categoryId: string,
  keyword: string,
) {
  if (!keyword || keyword.length < 2) return;

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("keywords")
    .eq("id", categoryId)
    .single();

  if (!category) return;

  const keywords: string[] = category.keywords ?? [];
  if (keywords.includes(keyword)) return;

  await supabase
    .from("categories")
    .update({ keywords: [...keywords, keyword] })
    .eq("id", categoryId);
}
