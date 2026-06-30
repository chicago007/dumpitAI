import { parseLineTypePrefix } from "@/lib/ai-inbox-normalize";
import type { InboxItemKind } from "@/lib/ai-inbox-types";
import {
  formatBoardDateRangeKo,
  parseBoardDateRange,
} from "@/lib/board-date-range";
import { extractDueDate } from "@/lib/classify";
import {
  type BoardCurrency,
  parseBoardMoney,
  stripMoneyFromContent,
} from "@/lib/board-money";

export type BoardInputKind =
  | "checklist"
  | "schedule"
  | "period"
  | "memo"
  | "budget"
  | "expense";

const BUDGET_KEYWORDS = /예산|총\s*예산|budget/i;
const DEADLINE_PARTICLE = /까지|까진|까지는/;
const EXPENSE_KEYWORDS =
  /지출|결제|식비|교통비|카페|라멘|점심|저녁|아침|커피|맛집|식당|입장료|관람|쇼핑/;
const SCHEDULE_KEYWORDS =
  /출국|입국|체크인|미팅|회의|일정|약속|관람|투어/;
const CHECKLIST_PLANNED_KEYWORDS =
  /비행기|항공|숙박|호텔|보험|준비|예약|티켓|패스|렌터카|이동편|교통편|여행보험|여권|비행기표/;

const FORCED_BOARD_KIND: Partial<Record<InboxItemKind, BoardInputKind>> = {
  todo: "checklist",
  checklist: "checklist",
  schedule: "schedule",
  period: "period",
  memo: "memo",
  budget: "budget",
  expense: "expense",
};

export interface BoardClassifyResult {
  kind: BoardInputKind;
  cleanedContent: string;
  amount: number | null;
  currency: BoardCurrency;
  dueAt: Date | null;
  startDate?: string | null;
  endDate?: string | null;
  previewLabel: string;
  /** 카테고리/항목 형식 입력 시 체크리스트 그룹 이름 */
  groupName?: string;
}

/** `체크리스트 기본/여권` · `기본/여권 5만원` 형식 파싱 */
export function parseChecklistCategoryItem(content: string): {
  groupName: string;
  itemText: string;
} | null {
  const trimmed = content.trim();
  const withoutPrefix = trimmed.replace(/^체크리스트\s*/i, "").trim();
  const slashIdx = withoutPrefix.indexOf("/");
  if (slashIdx <= 0) return null;

  const groupName = withoutPrefix.slice(0, slashIdx).trim();
  const itemText = withoutPrefix.slice(slashIdx + 1).trim();
  if (!groupName || !itemText) return null;

  return { groupName, itemText };
}

export function classifyBoardInput(content: string): BoardClassifyResult {
  const trimmed = content.trim();
  const { forceKind, content: prefixedBody } = parseLineTypePrefix(trimmed);
  const body =
    forceKind && prefixedBody !== trimmed ? prefixedBody : trimmed;

  const periodRange = parseBoardDateRange(body);
  if (periodRange) {
    const label = formatBoardDateRangeKo(
      periodRange.startDate,
      periodRange.endDate,
    );
    return {
      kind: "period",
      cleanedContent: "",
      amount: null,
      currency: "KRW",
      dueAt: null,
      startDate: periodRange.startDate,
      endDate: periodRange.endDate,
      previewLabel: `프로젝트 기간 · ${label}`,
    };
  }

  const categoryItem = parseChecklistCategoryItem(body);

  if (categoryItem) {
    const { date: dueAt, cleaned: afterDate } = extractDueDate(
      categoryItem.itemText,
    );
    const money = parseBoardMoney(afterDate);
    const cleaned =
      stripMoneyFromContent(afterDate) || categoryItem.itemText.trim();

    const parts = [
      "체크리스트",
      `${categoryItem.groupName} / ${cleaned}`,
    ];
    if (money.amount !== null) {
      parts.push(
        money.currency === "KRW"
          ? `${money.amount.toLocaleString()}원`
          : `${money.amount} ${money.currency}`,
      );
    }
    if (dueAt) {
      parts.push(
        dueAt.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      );
    }

    return {
      kind: "checklist",
      cleanedContent: cleaned,
      amount: money.amount,
      currency: money.currency,
      dueAt,
      groupName: categoryItem.groupName,
      previewLabel: parts.join(" · "),
    };
  }

  const { date: dueAt, cleaned: afterDate } = extractDueDate(body);
  const money = parseBoardMoney(afterDate);
  const cleaned = stripMoneyFromContent(afterDate) || body;

  const forcedKind = forceKind ? FORCED_BOARD_KIND[forceKind] : undefined;
  let kind: BoardInputKind = "checklist";

  if (forcedKind) {
    kind = forcedKind;
  } else if (DEADLINE_PARTICLE.test(body)) {
    kind = "checklist";
  } else if (BUDGET_KEYWORDS.test(body)) {
    kind = "budget";
  } else if (dueAt || SCHEDULE_KEYWORDS.test(body)) {
    kind = "schedule";
  } else if (money.amount !== null && CHECKLIST_PLANNED_KEYWORDS.test(body)) {
    kind = "checklist";
  } else if (
    money.amount !== null &&
    (EXPENSE_KEYWORDS.test(body) || !CHECKLIST_PLANNED_KEYWORDS.test(body))
  ) {
    kind = "expense";
  } else if (
    body.length > 60 ||
    body.includes("\n") ||
    /^[-•*]/m.test(body)
  ) {
    kind = "memo";
  }

  const kindLabels: Record<BoardInputKind, string> = {
    checklist: "체크리스트",
    schedule: "일정",
    period: "프로젝트 기간",
    memo: "메모",
    budget: "예산",
    expense: "지출",
  };

  const parts = [kindLabels[kind]];
  if (money.amount !== null) {
    parts.push(
      money.currency === "KRW"
        ? `${money.amount.toLocaleString()}원`
        : `${money.amount} ${money.currency}`,
    );
  }
  if (dueAt) {
    parts.push(
      dueAt.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    );
  }

  return {
    kind,
    cleanedContent: cleaned,
    amount: money.amount,
    currency: money.currency,
    dueAt,
    previewLabel: parts.join(" · "),
  };
}
