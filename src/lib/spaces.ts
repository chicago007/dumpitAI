export type Space = "work" | "personal";
export type ViewSpace = Space | "all";

export const SPACE_COOKIE = "dumpit_space";

export const SPACE_LABELS: Record<Space, string> = {
  work: "업무",
  personal: "개인",
};

export const VIEW_SPACE_LABELS: Record<ViewSpace, string> = {
  all: "전체",
  work: "업무",
  personal: "개인",
};

export const SPACE_DESCRIPTIONS: Record<ViewSpace, string> = {
  all: "업무와 개인 항목을 한꺼번에 봅니다",
  work: "회의, 보고서, 프로젝트 등 업무 항목",
  personal: "여행, 생활, 운동 등 개인 항목",
};

export const WORK_CATEGORY_NAMES = ["업무", "학습"] as const;

const WORK_KEYWORDS = [
  "회의",
  "보고서",
  "제출",
  "프로젝트",
  "이메일",
  "미팅",
  "업무",
  "출장",
  "발표",
  "기획",
  "문서",
  "승인",
];

export function isSpace(value: string | null | undefined): value is Space {
  return value === "work" || value === "personal";
}

export function isViewSpace(
  value: string | null | undefined,
): value is ViewSpace {
  return value === "all" || isSpace(value);
}

export function categorySpaceFromName(name: string): Space {
  return WORK_CATEGORY_NAMES.includes(
    name as (typeof WORK_CATEGORY_NAMES)[number],
  )
    ? "work"
    : "personal";
}

export function inferSpaceFromContent(content: string): Space | null {
  const lower = content.toLowerCase();
  let workScore = 0;
  for (const kw of WORK_KEYWORDS) {
    if (lower.includes(kw)) workScore += 1;
  }
  if (workScore >= 2) return "work";
  if (workScore === 1 && !lower.includes("여행")) return "work";
  return null;
}

export function getDefaultCategoryNameForSpace(space: Space) {
  return space === "work" ? "업무" : "기타";
}

/** DB에 저장할 공간 — 전체 보기에서는 반드시 명시 */
export function resolveEntrySpace(
  viewSpace: ViewSpace,
  explicit?: Space | null,
): Space {
  if (explicit) return explicit;
  if (viewSpace === "all") {
    throw new Error("저장할 공간을 /업무 또는 /개인으로 지정해 주세요.");
  }
  return viewSpace;
}
