import type { Entry } from "./types";

const TRAVEL_DESTINATIONS = [
  "제주도",
  "제주",
  "부산",
  "강릉",
  "경주",
  "여수",
  "속초",
  "전주",
  "도쿄",
  "동경",
  "오사카",
  "후쿠오카",
  "교토",
  "일본",
  "방콕",
  "푸켓",
  "태국",
  "다낭",
  "하노이",
  "베트남",
  "싱가포르",
  "홍콩",
  "대만",
  "타이베이",
  "파리",
  "런던",
  "로마",
  "유럽",
  "뉴욕",
  "하와이",
  "미국",
  "호주",
  "시드니",
  "괌",
  "사이판",
  "몰디브",
  "발리",
  "서울",
  "해외",
] as const;

export const TRAVEL_CATEGORY_NAME = "여행";
export const UNKNOWN_DESTINATION = "미지정";

export interface TravelMeta {
  destination: string | null;
  amount: number | null;
}

export function isTravelCategoryName(name: string | undefined | null) {
  return name === TRAVEL_CATEGORY_NAME;
}

export function getTravelMeta(metadata: Record<string, unknown>): TravelMeta {
  const destination =
    typeof metadata.destination === "string" && metadata.destination.trim()
      ? metadata.destination.trim()
      : null;
  const amount =
    typeof metadata.amount === "number" && metadata.amount >= 0
      ? metadata.amount
      : null;

  return { destination, amount };
}

export function buildTravelMetadata(
  destination: string | null,
  amount: number | null,
): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  if (destination?.trim()) meta.destination = destination.trim();
  if (amount !== null && amount >= 0) meta.amount = amount;
  return meta;
}

export function parseDestination(content: string): string | null {
  const sorted = [...TRAVEL_DESTINATIONS].sort((a, b) => b.length - a.length);

  for (const place of sorted) {
    if (content.includes(place)) {
      return normalizeDestination(place);
    }
  }

  return null;
}

export function normalizeDestination(value: string) {
  if (value === "제주") return "제주도";
  if (value === "동경" || value === "동경여행") return "도쿄";
  return value;
}

const DOMESTIC_DESTINATIONS = new Set([
  "제주도",
  "부산",
  "강릉",
  "경주",
  "여수",
  "속초",
  "전주",
  "서울",
]);

const BEACH_DESTINATIONS = new Set([
  "제주도",
  "태국",
  "푸켓",
  "하와이",
  "괌",
  "사이판",
  "몰디브",
  "발리",
  "베트남",
  "다낭",
  "호주",
  "시드니",
]);

export function isInternationalDestination(destination: string | null) {
  if (!destination) return true;
  return !DOMESTIC_DESTINATIONS.has(destination);
}

export function isBeachDestination(destination: string | null) {
  if (!destination) return false;
  return BEACH_DESTINATIONS.has(destination);
}

export function parseAmount(content: string): number | null {
  const manMatch = content.match(/(\d+(?:\.\d+)?)\s*만\s*(?:원)?/);
  if (manMatch) {
    return Math.round(parseFloat(manMatch[1]) * 10000);
  }

  const cheonMatch = content.match(/(\d+(?:\.\d+)?)\s*천\s*(?:원)?/);
  if (cheonMatch) {
    return Math.round(parseFloat(cheonMatch[1]) * 1000);
  }

  const wonMatch = content.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
  if (wonMatch) {
    return parseInt(wonMatch[1].replace(/,/g, ""), 10);
  }

  const symbolMatch = content.match(/₩\s*(\d{1,3}(?:,\d{3})+|\d+)/);
  if (symbolMatch) {
    return parseInt(symbolMatch[1].replace(/,/g, ""), 10);
  }

  return null;
}

export function formatCurrency(amount: number) {
  return `${new Intl.NumberFormat("ko-KR").format(amount)}원`;
}

export function parseAmountInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digitsOnly = trimmed.replace(/,/g, "");
  if (/^\d+$/.test(digitsOnly)) {
    return parseInt(digitsOnly, 10);
  }

  return parseAmount(trimmed);
}

export function formatAmountInput(amount: number | null) {
  if (amount === null) return "";
  return new Intl.NumberFormat("ko-KR").format(amount);
}

export interface DestinationGroup {
  destination: string;
  entries: Entry[];
  totalAmount: number;
}

export function groupEntriesByDestination(entries: Entry[]): DestinationGroup[] {
  const groups = new Map<string, Entry[]>();

  for (const entry of entries) {
    const { destination } = getTravelMeta(entry.metadata ?? {});
    const key = destination ?? UNKNOWN_DESTINATION;
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([destination, groupEntries]) => ({
      destination,
      entries: groupEntries,
      totalAmount: groupEntries.reduce((sum, entry) => {
        const { amount } = getTravelMeta(entry.metadata ?? {});
        return sum + (amount ?? 0);
      }, 0),
    }))
    .sort((a, b) => a.destination.localeCompare(b.destination, "ko"));
}

export function sumTravelAmount(entries: Entry[]) {
  return entries.reduce((sum, entry) => {
    const { amount } = getTravelMeta(entry.metadata ?? {});
    return sum + (amount ?? 0);
  }, 0);
}
