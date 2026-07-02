import type { CustomActivityType } from "@/lib/activity-catalog";
import type { ActivityTypeDefinition } from "@/lib/activity-catalog";

export interface ParsedActivityInput {
  activityKey: string;
  content: string;
  durationMin: number | null;
  quantity: number | null;
  unit: string | null;
}

const READING_PREFIX = /^(독서|책|읽기)\s*/;
const EXERCISE_PREFIX =
  /^(운동|헬스|러닝|조깅|요가|수영|자전거|걷기|웨이트)\s*/;

const DURATION_MIN = /(\d+)\s*분/;
const DURATION_HOUR = /(\d+)\s*시간(?:\s*(\d+)\s*분?)?/;
const QUANTITY_KM = /(\d+(?:\.\d+)?)\s*km/i;
const QUANTITY_PAGE = /(\d+)\s*(?:페이지|p|P)/i;

function parseDuration(text: string): number | null {
  const hourMatch = text.match(DURATION_HOUR);
  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    const mins = hourMatch[2] ? Number(hourMatch[2]) : 0;
    return hours * 60 + mins;
  }

  const minMatch = text.match(DURATION_MIN);
  if (minMatch) return Number(minMatch[1]);

  return null;
}

function parseQuantity(text: string): { quantity: number; unit: string } | null {
  const km = text.match(QUANTITY_KM);
  if (km) return { quantity: Number(km[1]), unit: "km" };

  const page = text.match(QUANTITY_PAGE);
  if (page) return { quantity: Number(page[1]), unit: "page" };

  return null;
}

function stripMetrics(text: string) {
  return text
    .replace(DURATION_HOUR, "")
    .replace(DURATION_MIN, "")
    .replace(QUANTITY_KM, "")
    .replace(QUANTITY_PAGE, "")
    .replace(/[《》「」[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchCustomPrefix(text: string, label: string) {
  if (!text.startsWith(label)) return null;
  const rest = text.slice(label.length);
  if (rest === "" || /^\s/.test(rest)) return rest.trim();
  return null;
}

function buildParsed(
  activityKey: string,
  body: string,
): ParsedActivityInput | null {
  const durationMin = parseDuration(body);
  const quantityInfo = parseQuantity(body);
  const content = stripMetrics(body);

  if (!durationMin && !quantityInfo && !content) return null;

  return {
    activityKey,
    content,
    durationMin,
    quantity: quantityInfo?.quantity ?? null,
    unit: quantityInfo?.unit ?? (durationMin ? "min" : null),
  };
}

export function parseActivityInput(
  raw: string,
  customTypes: CustomActivityType[] = [],
): ParsedActivityInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (READING_PREFIX.test(trimmed)) {
    const body = trimmed.replace(READING_PREFIX, "").trim();
    return buildParsed("reading", body);
  }

  if (EXERCISE_PREFIX.test(trimmed)) {
    const body = trimmed.replace(EXERCISE_PREFIX, "").trim();
    return buildParsed("exercise", body);
  }

  const sortedCustom = [...customTypes].sort(
    (a, b) => b.label.length - a.label.length,
  );
  for (const custom of sortedCustom) {
    const rest = matchCustomPrefix(trimmed, custom.label.trim());
    if (rest !== null) {
      return buildParsed(custom.key, rest);
    }
  }

  return null;
}

export function formatActivitySummary(
  log: {
    content: string;
    duration_min: number | null;
    quantity: number | null;
    unit: string | null;
  },
  fallbackLabel?: string,
) {
  const parts: string[] = [];
  if (log.duration_min) {
    if (log.duration_min >= 60 && log.duration_min % 60 === 0) {
      parts.push(`${log.duration_min / 60}시간`);
    } else {
      parts.push(`${log.duration_min}분`);
    }
  }
  if (log.quantity != null && log.unit === "km") {
    parts.push(`${log.quantity}km`);
  }
  if (log.quantity != null && log.unit === "page") {
    parts.push(`${log.quantity}페이지`);
  }
  if (log.content) parts.push(log.content);
  return parts.join(" · ") || fallbackLabel || "기록";
}

export function formatActivityInputHint(catalog: ActivityTypeDefinition[]) {
  const customLabels = catalog
    .filter((t) => !t.builtin)
    .map((t) => t.label)
    .slice(0, 3);
  const customHint =
    customLabels.length > 0 ? `, ${customLabels.join("/")}` : "";
  return `Enter로 저장 · 독서/운동${customHint} + 시간·거리·페이지`;
}
