import type { BoardMetadata } from "@/lib/board-types";

export type BoardCurrency = "KRW" | "USD" | "JPY" | "EUR";

export const BOARD_CURRENCIES: {
  code: BoardCurrency;
  label: string;
  symbol: string;
}[] = [
  { code: "KRW", label: "원 (KRW)", symbol: "₩" },
  { code: "USD", label: "달러 (USD)", symbol: "$" },
  { code: "JPY", label: "엔 (JPY)", symbol: "¥" },
  { code: "EUR", label: "유로 (EUR)", symbol: "€" },
];

const MONEY_STRIP_PATTERNS = [
  /\$\s*[\d,]+(?:\.\d+)?/g,
  /[\d,]+(?:\.\d+)?\s*(?:usd|달러)/gi,
  /(?:¥|엔)\s*[\d,]+(?:\.\d+)?/g,
  /[\d,]+(?:\.\d+)?\s*(?:엔|円|yen)/gi,
  /€\s*[\d,]+(?:\.\d+)?/g,
  /[\d,]+(?:\.\d+)?\s*(?:eur|유로|€)/gi,
  /₩\s*[\d,]+/g,
  /\d+(?:\.\d+)?\s*만\s*(?:원)?/g,
  /\d+(?:\.\d+)?\s*천\s*(?:원)?/g,
  /\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*원/g,
  /\d+\s*원/g,
];

export function stripMoneyFromContent(content: string): string {
  let cleaned = content;
  for (const pattern of MONEY_STRIP_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

export function parseBoardMoney(content: string): {
  amount: number | null;
  currency: BoardCurrency;
} {
  const jpyBefore = content.match(
    /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:엔|円|yen)/i,
  );
  if (jpyBefore) {
    return {
      amount: parseInt(jpyBefore[1].replace(/,/g, ""), 10),
      currency: "JPY",
    };
  }

  const jpyAfter = content.match(/(?:¥|엔)\s*(\d{1,3}(?:,\d{3})*|\d+)/);
  if (jpyAfter) {
    return {
      amount: parseInt(jpyAfter[1].replace(/,/g, ""), 10),
      currency: "JPY",
    };
  }

  const usdBefore = content.match(
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:usd|달러)/i,
  );
  if (usdBefore) {
    return {
      amount: Math.round(parseFloat(usdBefore[1].replace(/,/g, ""))),
      currency: "USD",
    };
  }

  const usd = content.match(
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/,
  );
  if (usd) {
    return {
      amount: Math.round(parseFloat(usd[1].replace(/,/g, ""))),
      currency: "USD",
    };
  }

  const eurBefore = content.match(
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:eur|유로|€)/i,
  );
  if (eurBefore) {
    return {
      amount: Math.round(parseFloat(eurBefore[1].replace(/,/g, ""))),
      currency: "EUR",
    };
  }

  const eur = content.match(/€\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/);
  if (eur) {
    return {
      amount: Math.round(parseFloat(eur[1].replace(/,/g, ""))),
      currency: "EUR",
    };
  }

  const manMatch = content.match(/(\d+(?:\.\d+)?)\s*만\s*(?:원)?/);
  if (manMatch) {
    return {
      amount: Math.round(parseFloat(manMatch[1]) * 10000),
      currency: "KRW",
    };
  }

  const cheonMatch = content.match(/(\d+(?:\.\d+)?)\s*천\s*(?:원)?/);
  if (cheonMatch) {
    return {
      amount: Math.round(parseFloat(cheonMatch[1]) * 1000),
      currency: "KRW",
    };
  }

  const wonMatch = content.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
  if (wonMatch) {
    return {
      amount: parseInt(wonMatch[1].replace(/,/g, ""), 10),
      currency: "KRW",
    };
  }

  const symbolMatch = content.match(/₩\s*(\d{1,3}(?:,\d{3})+|\d+)/);
  if (symbolMatch) {
    return {
      amount: parseInt(symbolMatch[1].replace(/,/g, ""), 10),
      currency: "KRW",
    };
  }

  return { amount: null, currency: "KRW" };
}

export function formatBoardMoney(
  amount: number,
  currency: BoardCurrency = "KRW",
): string {
  const c = BOARD_CURRENCIES.find((x) => x.code === currency);
  const formatted = new Intl.NumberFormat(
    currency === "KRW" ? "ko-KR" : "en-US",
  ).format(amount);
  if (currency === "KRW") return `${formatted}원`;
  return `${c?.symbol ?? ""}${formatted}`;
}

export function getBoardCurrency(
  metadata: BoardMetadata | Record<string, unknown> | undefined,
): BoardCurrency {
  const c = metadata?.currency;
  if (c === "USD" || c === "JPY" || c === "EUR" || c === "KRW") return c;
  return "KRW";
}

export function sumBoardExpensesInCurrency(
  expenses: { amount: number; currency?: string }[] | undefined,
  currency: BoardCurrency,
): number {
  return (expenses ?? []).reduce((sum, e) => {
    const c =
      e.currency === "USD" ||
      e.currency === "JPY" ||
      e.currency === "EUR" ||
      e.currency === "KRW"
        ? e.currency
        : "KRW";
    return c === currency ? sum + e.amount : sum;
  }, 0);
}

export function parsePlannedAmount(
  value: unknown,
): number | null {
  if (typeof value === "number" && value > 0) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.]/g, ""));
    if (n > 0) return Math.round(n);
  }
  return null;
}
