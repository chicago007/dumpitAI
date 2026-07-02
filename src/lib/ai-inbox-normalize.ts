import { extractDueDate } from "@/lib/classify";
import type { AiInboxClassification, AiScheduleItem } from "@/lib/ai-inbox-types";
import type { InboxItemKind } from "@/lib/ai-inbox-types";
import { parseLineTypePrefix } from "@/lib/line-type-prefix";

export { parseLineTypePrefix } from "@/lib/line-type-prefix";

const DEADLINE_PARTICLE = /까지|까진|까지는/;
const TRAVEL_PROJECT =
  /(?:\d{1,2}\s*월\s*\d{1,2}\s*일\s*)?([가-힣A-Za-z0-9]+여행)\s*$/;
const PROJECT_LINE = /^(?:프로젝트|@(?:p|프로젝트))\s*(.+)$/i;

function forcedClassification(
  body: string,
  forceKind: InboxItemKind,
): AiInboxClassification {
  const { date, cleaned } = extractDueDate(body);
  const text = cleaned || body;

  if (forceKind === "schedule") {
    return {
      project: null,
      todos: [],
      schedules: [{ title: text, start_date: date?.toISOString() ?? null }],
      notes: [],
    };
  }

  if (forceKind === "memo" || forceKind === "budget" || forceKind === "expense") {
    return { project: null, todos: [], schedules: [], notes: [text] };
  }

  // todo, checklist → 할일 목록
  const todoPayload =
    date && DEADLINE_PARTICLE.test(body)
      ? `__due__${date.toISOString()}__${text}`
      : text;

  return {
    project: null,
    todos: [todoPayload],
    schedules: [],
    notes: [],
  };
}

function empty(): AiInboxClassification {
  return { project: null, todos: [], schedules: [], notes: [] };
}

export function splitInboxLines(text: string): string[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export interface InboxInputBlock {
  explicitProject: string | null;
  lines: string[];
}

/** 첫 줄이 `프로젝트 이름` 또는 `@p 이름`이면 프로젝트 블록으로 파싱 */
export function parseInboxBlocks(text: string): InboxInputBlock {
  const lines = splitInboxLines(text);
  if (lines.length === 0) {
    return { explicitProject: null, lines: [] };
  }

  const match = lines[0].match(PROJECT_LINE);
  if (match) {
    return {
      explicitProject: match[1].trim() || null,
      lines: lines.slice(1),
    };
  }

  return { explicitProject: null, lines };
}

function detectSharedProject(lines: string[]): string | null {
  const travel = lines
    .map((line) => line.match(TRAVEL_PROJECT)?.[1]?.trim())
    .find(Boolean);
  if (travel) return travel ?? null;

  const tokens = lines.map((line) => {
    const m = line.match(/([가-힣A-Za-z0-9]+랩)\s/);
    return m?.[1] ?? null;
  });
  const lab = tokens.find(Boolean);
  if (lab && tokens.filter((t) => t === lab).length >= 2) return lab;

  return null;
}

function lineAsTravelProject(line: string): string | null {
  const m = line.match(TRAVEL_PROJECT);
  if (!m) return null;
  if (DEADLINE_PARTICLE.test(line)) return null;
  return m[1].trim();
}

function cleanScheduleItem(
  item: AiScheduleItem,
): { todo: string; due: string | null } | { schedule: AiScheduleItem } {
  const rawTitle = item.title.trim();
  if (DEADLINE_PARTICLE.test(rawTitle)) {
    const { date, cleaned } = extractDueDate(rawTitle);
    return {
      todo: cleaned || rawTitle.replace(DEADLINE_PARTICLE, "").trim(),
      due: date?.toISOString() ?? item.start_date,
    };
  }

  const { date, cleaned } = extractDueDate(rawTitle);
  const title = cleaned || rawTitle;
  const start = item.start_date ?? (date ? date.toISOString() : null);

  return {
    schedule: {
      title,
      start_date: start,
    },
  };
}

function cleanTodoLine(text: string): { content: string; due: string | null } {
  const { date, cleaned } = extractDueDate(text);
  return {
    content: cleaned || text.trim(),
    due: date?.toISOString() ?? null,
  };
}

/** 날짜만 있으면 일정, '~까지'가 있으면 할일 */
function classifyLineByDateRule(line: string): AiInboxClassification | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const { date, cleaned } = extractDueDate(trimmed);

  if (DEADLINE_PARTICLE.test(trimmed)) {
    return {
      project: null,
      todos: [
        date
          ? `__due__${date.toISOString()}__${cleaned || trimmed}`
          : cleaned || trimmed,
      ],
      schedules: [],
      notes: [],
    };
  }

  if (date) {
    return {
      project: null,
      todos: [],
      schedules: [
        {
          title: cleaned || trimmed,
          start_date: date.toISOString(),
        },
      ],
      notes: [],
    };
  }

  return null;
}

/** 한 줄 분류 결과에 규칙 적용 */
export function normalizeLineClassification(
  line: string,
  raw: AiInboxClassification,
): AiInboxClassification {
  const { forceKind, content } = parseLineTypePrefix(line);
  const body = content || line;

  if (forceKind) {
    return forcedClassification(body, forceKind);
  }

  const travelProject = lineAsTravelProject(line);
  if (travelProject) {
    return {
      project: travelProject,
      todos: [],
      schedules: [],
      notes: [],
    };
  }

  const result = empty();
  result.project = raw.project?.trim() || null;

  for (const todo of raw.todos) {
    const { content, due } = cleanTodoLine(todo);
    if (!content) continue;
    if (DEADLINE_PARTICLE.test(todo)) {
      result.todos.push(due ? `__due__${due}__${content}` : content);
    } else if (due) {
      result.schedules.push({
        title: content,
        start_date: due,
      });
    } else {
      result.todos.push(content);
    }
  }

  for (const schedule of raw.schedules) {
    const converted = cleanScheduleItem(schedule);
    if ("todo" in converted) {
      const payload = converted.due
        ? `__due__${converted.due}__${converted.todo}`
        : converted.todo;
      result.todos.push(payload);
    } else if (converted.schedule.title) {
      result.schedules.push(converted.schedule);
    }
  }

  for (const note of raw.notes) {
    const { cleaned } = extractDueDate(note);
    if (cleaned) result.notes.push(cleaned);
  }

  if (
    result.todos.length === 0 &&
    result.schedules.length === 0 &&
    result.notes.length === 0 &&
    !result.project
  ) {
    const byDate = classifyLineByDateRule(line);
    if (byDate) return byDate;
  }

  return result;
}

export function mergeClassifications(
  items: AiInboxClassification[],
): AiInboxClassification {
  const merged = empty();
  for (const item of items) {
    if (!merged.project && item.project) merged.project = item.project;
    merged.todos.push(...item.todos);
    merged.schedules.push(...item.schedules);
    merged.notes.push(...item.notes);
  }
  return merged;
}

export function finalizeInboxClassification(
  lines: string[],
  merged: AiInboxClassification,
  explicitProject?: string | null,
): AiInboxClassification {
  if (explicitProject) {
    merged.project = explicitProject;
  } else {
    const shared = detectSharedProject(lines);
    if (shared && !merged.project) {
      merged.project = shared;
    }
  }
  return merged;
}

export function parseTodoPayload(todo: string): {
  content: string;
  dueAt: string | null;
} {
  const m = todo.match(/^__due__(.+?)__(.+)$/);
  if (m) {
    return { dueAt: m[1], content: m[2].trim() };
  }
  const { content, due } = cleanTodoLine(todo);
  return { content, dueAt: due };
}
