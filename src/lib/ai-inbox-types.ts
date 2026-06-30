/** Gemini Structured Output 분류 결과 */
import type { Space } from "@/lib/spaces";

export interface AiScheduleItem {
  title: string;
  start_date: string | null;
}

export interface AiInboxClassification {
  project: string | null;
  todos: string[];
  schedules: AiScheduleItem[];
  notes: string[];
}

export type InboxItemKind =
  | "todo"
  | "schedule"
  | "memo"
  | "checklist"
  | "budget"
  | "expense"
  | "period";

export interface InboxPreviewItem {
  id: string;
  rawLine: string;
  kind: InboxItemKind;
  content: string;
  targetSpace: Space;
  dueAt: string | null;
  startDate?: string | null;
  endDate?: string | null;
  amount: number | null;
  currency: string;
  groupName: string | null;
  tabLabel: string;
}

export interface InboxPreviewResult {
  project: string | null;
  isProjectBlock: boolean;
  items: InboxPreviewItem[];
  originalText: string;
  /** 전체 보기에서 공간을 추정했을 때 저장 전 확인 */
  needsSpaceConfirm?: boolean;
  /** 추정된 공간 (확인 UI용) */
  suggestedSpace?: Space;
}

export interface InboxLog {
  id: string;
  user_id: string;
  original_text: string;
  ai_result: AiInboxClassification | null;
  space: string;
  created_at: string;
}

export interface InboxProcessResult {
  logId: string;
  classification: AiInboxClassification;
  boardId: string | null;
  created: {
    todos: number;
    schedules: number;
    notes: number;
    checklist: number;
    budget: number;
    expense: number;
  };
}

export const INBOX_KIND_LABELS: Record<InboxItemKind, string> = {
  todo: "할일",
  schedule: "일정",
  memo: "메모",
  checklist: "체크리스트",
  budget: "예산",
  expense: "지출",
  period: "프로젝트 기간",
};

export const GLOBAL_INBOX_KINDS: InboxItemKind[] = [
  "todo",
  "schedule",
  "memo",
];

export const PROJECT_INBOX_KINDS: InboxItemKind[] = [
  "checklist",
  "schedule",
  "period",
  "memo",
  "budget",
  "expense",
];

/** @접두어 → 분류 종류 (긴 키 우선 매칭) */
export const INBOX_PREFIX_ALIASES: Record<string, InboxItemKind> = {
  checklist: "checklist",
  expense: "expense",
  budget: "budget",
  체크리스트: "checklist",
  할일: "todo",
  일정: "schedule",
  메모: "memo",
  예산: "budget",
  지출: "expense",
  기간: "period",
  period: "period",
  t: "todo",
  s: "schedule",
  m: "memo",
};
