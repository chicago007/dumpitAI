export type BoardProjectType =
  | "travel"
  | "business"
  | "camping"
  | "study"
  | "work"
  | "custom";

export interface BoardChecklistGroup {
  id: string;
  name: string;
}

export interface BoardBudgetCategory {
  id: string;
  name: string;
  amount: number;
}

export interface BoardAiSuggestion {
  id: string;
  label: string;
}

export interface BoardExpense {
  id: string;
  date: string;
  category: string;
  amount: number;
  memo: string;
  currency?: string;
  sourceEntryId?: string;
  fromChecklist?: boolean;
}

export interface BoardMetadata {
  checklistGroups?: BoardChecklistGroup[];
  checklistItemOrder?: Record<string, string[]>;
  budgetCategories?: BoardBudgetCategory[];
  expenses?: BoardExpense[];
  aiSuggestions?: BoardAiSuggestion[];
  /** 프로젝트 상단 탭 분류 */
  boardTabs?: BoardTabConfig[];
  destination?: string;
  season?: string;
  customTypeLabel?: string;
  currency?: string;
}

export interface BoardTabConfig {
  id: string;
  kind: BoardTab;
  label: string;
  /** 체크리스트 하위 카테고리 전용 탭 */
  checklistGroupId?: string;
}

export const BOARD_PROJECT_TYPE_LABELS: Record<BoardProjectType, string> = {
  travel: "여행",
  business: "출장",
  camping: "캠핑",
  study: "공부",
  work: "업무",
  custom: "직접입력",
};

export type BoardTab =
  | "checklist"
  | "schedule"
  | "memo"
  | "budget"
  | "expense"
  | "ai";

export const BOARD_TABS: { id: BoardTab; label: string }[] = [
  { id: "checklist", label: "체크리스트" },
  { id: "schedule", label: "일정" },
  { id: "memo", label: "메모" },
  { id: "budget", label: "예산" },
  { id: "expense", label: "지출" },
  { id: "ai", label: "AI" },
];
