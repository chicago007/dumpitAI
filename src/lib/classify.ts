import type { Category, ClassificationResult, EntryType } from "./types";

const TODO_KEYWORDS = [
  "해야",
  "하기",
  "제출",
  "확인",
  "준비",
  "구매",
  "예약",
  "신청",
  "정리",
  "보내",
  "만들",
  "작성",
  "읽어",
];

const SCHEDULE_KEYWORDS = [
  "미팅",
  "회의",
  "약속",
  "모임",
  "일정",
  "스케줄",
  "헬스장",
  "수업",
  "강의",
];

const RELATIVE_DATES: Record<string, number> = {
  오늘: 0,
  내일: 1,
  모레: 2,
};

const WEEKDAYS: Record<string, number> = {
  일요일: 0,
  월요일: 1,
  화요일: 2,
  수요일: 3,
  목요일: 4,
  금요일: 5,
  토요일: 6,
};

function parseDueDate(content: string): Date | null {
  const now = new Date();
  now.setHours(9, 0, 0, 0);

  for (const [word, offset] of Object.entries(RELATIVE_DATES)) {
    if (content.includes(word)) {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      return date;
    }
  }

  const daysLater = content.match(/(\d+)\s*일\s*(뒤|후)/);
  if (daysLater) {
    const date = new Date(now);
    date.setDate(date.getDate() + parseInt(daysLater[1], 10));
    return date;
  }

  for (const [day, target] of Object.entries(WEEKDAYS)) {
    if (content.includes(day)) {
      const date = new Date(now);
      const current = date.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7;
      date.setDate(date.getDate() + diff);
      return date;
    }
  }

  const timeMatch = content.match(/(\d{1,2})\s*시/);
  if (timeMatch && (content.includes("오늘") || content.includes("저녁"))) {
    const date = new Date();
    date.setHours(parseInt(timeMatch[1], 10), 0, 0, 0);
    return date;
  }

  return null;
}

function classifyType(content: string): EntryType {
  const checklistRegex = /체크리스트|\b체크\s*리스트\b|체크리스크|점검/;
  if (checklistRegex.test(content)) return "checklist";

  const hasDate =
    Object.keys(RELATIVE_DATES).some((w) => content.includes(w)) ||
    Object.keys(WEEKDAYS).some((w) => content.includes(w)) ||
    /\d+\s*일\s*(뒤|후)/.test(content) ||
    /\d{1,2}\s*시/.test(content);

  const scheduleScore = SCHEDULE_KEYWORDS.filter((k) =>
    content.includes(k),
  ).length;
  const todoScore = TODO_KEYWORDS.filter((k) => content.includes(k)).length;

  if (hasDate && scheduleScore > 0) return "schedule";
  if (hasDate && todoScore > 0) return "todo";
  if (scheduleScore > 0 && hasDate) return "schedule";
  if (todoScore > 0) return "todo";
  if (hasDate) return "schedule";
  return "memo";
}

function classifyCategory(
  content: string,
  categories: Category[],
): { category: Category; score: number } {
  const active = categories.filter((c) => !c.is_deleted);
  const fallback =
    active.find((c) => c.name === "기타") ?? active[active.length - 1];

  let best = { category: fallback, score: 0 };

  for (const cat of active) {
    if (cat.name === "기타") continue;
    const score = cat.keywords.filter((kw) =>
      kw.length > 0 ? content.includes(kw) : false,
    ).length;
    if (score > best.score) {
      best = { category: cat, score };
    }
  }

  return best;
}

export function classifyContent(
  content: string,
  categories: Category[],
): ClassificationResult {
  const trimmed = content.trim();
  const type = classifyType(trimmed);
  const { category, score } = classifyCategory(trimmed, categories);
  const dueAt = parseDueDate(trimmed);
  const maxKeywords = Math.max(
    ...categories.map((c) => c.keywords.length),
    1,
  );
  const confidence = Math.min(score / Math.max(maxKeywords * 0.3, 1), 1);

  return {
    type,
    categoryId: category.id,
    categoryName: category.name,
    dueAt,
    confidence: score > 0 ? confidence : 0.3,
  };
}

export function formatDueLabel(date: Date | null): string | null {
  if (!date) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  return target.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export const TYPE_LABELS: Record<EntryType, string> = {
  memo: "메모",
  todo: "할 일",
  schedule: "일정",
  checklist: "체크리스트",
};
