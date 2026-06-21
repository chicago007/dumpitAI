export type Space = "work" | "personal";

export const SPACE_COOKIE = "dumpit_space";

export const SPACE_LABELS: Record<Space, string> = {
  work: "업무",
  personal: "개인",
};

export const SPACE_DESCRIPTIONS: Record<Space, string> = {
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
