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

function atNineLocal(year: number, month0: number, day: number) {
  return new Date(year, month0, day, 9, 0, 0, 0);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 지난 날짜면 다음 해 또는 다음 달로 보정 */
function bumpPastDate(date: Date) {
  const today = startOfToday();
  if (date >= today) return date;

  const bumped = new Date(date);
  bumped.setMonth(bumped.getMonth() + 1);
  if (bumped >= today) return bumped;

  bumped.setFullYear(bumped.getFullYear() + 1);
  return bumped;
}

interface DateMatch {
  date: Date;
  /** 내용에서 제거할 매칭 부분 문자열 */
  match: string;
}

function parseFullDate(content: string): DateMatch | null {
  const match = content.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { date: atNineLocal(year, month - 1, day), match: match[0] };
}

function parseKoreanMonthDay(content: string): DateMatch | null {
  const match = content.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (!match) return null;

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const now = new Date();
  const date = atNineLocal(now.getFullYear(), month - 1, day);
  return { date: bumpPastDate(date), match: match[0] };
}

function parseSlashMonthDay(content: string): DateMatch | null {
  const match = content.match(/(?<!\d)(\d{1,2})[\/\-](\d{1,2})(?!\d)/);
  if (!match) return null;

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const now = new Date();
  const date = atNineLocal(now.getFullYear(), month - 1, day);
  return { date: bumpPastDate(date), match: match[0] };
}

function parseDayOfMonth(content: string): DateMatch | null {
  const match = content.match(/(?<!\d)(\d{1,2})\s*일(?!\s*(?:뒤|후))/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  if (day < 1 || day > 31) return null;

  const now = new Date();
  return { date: atNineLocal(now.getFullYear(), now.getMonth(), day), match: match[0] };
}

/** 입력 전체가 일(숫자)만인 경우 — 이번 달로 설정 */
function parseDayOnlyInput(content: string): DateMatch | null {
  const trimmed = content.trim();
  const match = trimmed.match(/^(\d{1,2})\s*일?$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  if (day < 1 || day > 31) return null;

  const now = new Date();
  return { date: atNineLocal(now.getFullYear(), now.getMonth(), day), match: match[0] };
}

function matchDueDate(content: string): DateMatch | null {
  const dayOnly = parseDayOnlyInput(content);
  if (dayOnly) return dayOnly;

  const full = parseFullDate(content);
  if (full) return full;

  const korean = parseKoreanMonthDay(content);
  if (korean) return korean;

  const slash = parseSlashMonthDay(content);
  if (slash) return slash;

  const now = new Date();
  now.setHours(9, 0, 0, 0);

  for (const [word, offset] of Object.entries(RELATIVE_DATES)) {
    if (content.includes(word)) {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      return { date, match: word };
    }
  }

  const daysLater = content.match(/(\d+)\s*일\s*(?:뒤|후)/);
  if (daysLater) {
    const date = new Date(now);
    date.setDate(date.getDate() + parseInt(daysLater[1], 10));
    return { date, match: daysLater[0] };
  }

  const dayOfMonth = parseDayOfMonth(content);
  if (dayOfMonth) return dayOfMonth;

  for (const [day, target] of Object.entries(WEEKDAYS)) {
    if (content.includes(day)) {
      const date = new Date(now);
      const current = date.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7;
      date.setDate(date.getDate() + diff);
      return { date, match: day };
    }
  }

  const timeMatch = content.match(/(\d{1,2})\s*시/);
  if (timeMatch && (content.includes("오늘") || content.includes("저녁"))) {
    const date = new Date();
    date.setHours(parseInt(timeMatch[1], 10), 0, 0, 0);
    return { date, match: timeMatch[0] };
  }

  return null;
}

function parseDueDate(content: string): Date | null {
  return matchDueDate(content)?.date ?? null;
}

/** 매칭된 날짜 텍스트(및 뒤따르는 조사)를 내용에서 제거 */
function stripDateText(content: string, match: string): string {
  const idx = content.indexOf(match);
  if (idx === -1) return content.trim();

  let end = idx + match.length;
  const after = content.slice(end);
  const particle = after.match(/^\s*(까지는|까지|까진|부터|에는|에)/);
  if (particle) end += particle[0].length;

  return (content.slice(0, idx) + content.slice(end))
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 내용에서 날짜를 추출하고, 날짜 텍스트를 제거한 내용을 함께 반환 */
export function extractDueDate(content: string): {
  date: Date | null;
  cleaned: string;
} {
  const trimmed = content.trim();
  const matched = matchDueDate(trimmed);
  if (!matched) return { date: null, cleaned: trimmed };

  return { date: matched.date, cleaned: stripDateText(trimmed, matched.match) };
}

function classifyType(content: string, dueAt: Date | null): EntryType {
  const checklistRegex = /체크리스트|\b체크\s*리스트\b|체크리스크|점검/;
  if (checklistRegex.test(content)) return "checklist";

  if (dueAt) return "schedule";

  const scheduleScore = SCHEDULE_KEYWORDS.filter((k) =>
    content.includes(k),
  ).length;
  const todoScore = TODO_KEYWORDS.filter((k) => content.includes(k)).length;

  if (scheduleScore > 0) return "schedule";
  if (todoScore > 0) return "todo";
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
  const dueAt = parseDueDate(trimmed);
  const type = classifyType(trimmed, dueAt);
  const { category, score } = classifyCategory(trimmed, categories);
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
