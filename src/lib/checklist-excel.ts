import { parseBoardMoney } from "@/lib/board-money";
import type { BoardCurrency } from "@/lib/board-money";

export interface ChecklistImportRow {
  groupName: string;
  label: string;
  plannedAmount?: number | null;
  currency?: BoardCurrency;
}

const GROUP_HEADERS = [
  "카테고리",
  "그룹",
  "category",
  "group",
  "section",
  "분류",
];
const LABEL_HEADERS = [
  "항목",
  "이름",
  "item",
  "name",
  "내용",
  "checklist",
  "할일",
  "todo",
];
const AMOUNT_HEADERS = [
  "예산",
  "금액",
  "amount",
  "budget",
  "비용",
  "price",
];

function cellValue(cell: unknown): string {
  if (cell == null) return "";
  return String(cell).trim();
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((c) => normalizeHeader(c));
  return normalized.some((c) =>
    GROUP_HEADERS.some((h) => normalizeHeader(h) === c) ||
    LABEL_HEADERS.some((h) => normalizeHeader(h) === c) ||
    AMOUNT_HEADERS.some((h) => normalizeHeader(h) === c),
  );
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => normalizeHeader(h));
  for (const candidate of candidates) {
    const idx = normalized.indexOf(normalizeHeader(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseAmountCell(value: string): {
  amount: number | null;
  currency: BoardCurrency;
} {
  if (!value) return { amount: null, currency: "KRW" };
  const money = parseBoardMoney(value);
  if (money.amount !== null) return money;
  const digits = Number(value.replace(/[^\d.]/g, ""));
  if (digits > 0) return { amount: Math.round(digits), currency: "KRW" };
  return { amount: null, currency: "KRW" };
}

/**
 * 2차원 시트 데이터 → 체크리스트 행
 * - 1열: 항목만 (기본 그룹)
 * - 2열: 카테고리 · 항목
 * - 3열+: 카테고리 · 항목 · 예산
 */
export function parseChecklistSheetRows(
  rawRows: unknown[][],
): ChecklistImportRow[] {
  const rows = rawRows
    .map((row) => row.map(cellValue))
    .filter((row) => row.some((c) => c.length > 0));

  if (rows.length === 0) return [];

  let dataRows = rows;
  let groupIdx = -1;
  let labelIdx = 0;
  let amountIdx = -1;

  if (isHeaderRow(rows[0])) {
    const headers = rows[0];
    groupIdx = findColumnIndex(headers, GROUP_HEADERS);
    labelIdx = findColumnIndex(headers, LABEL_HEADERS);
    amountIdx = findColumnIndex(headers, AMOUNT_HEADERS);

    if (labelIdx < 0) {
      const used = new Set([groupIdx, amountIdx].filter((i) => i >= 0));
      labelIdx = headers.findIndex((_, i) => !used.has(i));
    }
    if (labelIdx < 0) labelIdx = 0;

    dataRows = rows.slice(1);
  } else if (rows[0].length >= 3) {
    groupIdx = 0;
    labelIdx = 1;
    amountIdx = 2;
  } else if (rows[0].length === 2) {
    groupIdx = 0;
    labelIdx = 1;
  }

  const result: ChecklistImportRow[] = [];
  let lastGroup = "체크리스트";

  for (const row of dataRows) {
    const groupCell =
      groupIdx >= 0 && groupIdx < row.length ? row[groupIdx] : "";
    const label =
      labelIdx >= 0 && labelIdx < row.length ? row[labelIdx] : row[0] ?? "";
    const amountCell =
      amountIdx >= 0 && amountIdx < row.length ? row[amountIdx] : "";

    if (!label) continue;

    const groupName = groupCell || lastGroup;
    if (groupCell) lastGroup = groupCell;

    const { amount, currency } = parseAmountCell(amountCell);

    result.push({
      groupName,
      label,
      plannedAmount: amount,
      currency,
    });
  }

  return result;
}
