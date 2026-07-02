import { randomUUID } from "node:crypto";
import type { InboxPreviewItem } from "@/lib/ai-inbox-types";
import { INBOX_KIND_LABELS } from "@/lib/ai-inbox-types";
import {
  addSeoulMonths,
  getSeoulDateParts,
  getSeoulTodayKey,
  seoulDateKey,
  seoulIsoFromDateAndTime,
} from "@/lib/dates";
import { parseLineTypePrefix } from "@/lib/line-type-prefix";
import { parseSpaceLinePrefix } from "@/lib/space-input";
import type { Space, ViewSpace } from "@/lib/spaces";

const DAY_ONLY_PART = /^(\d{1,2})\s*일$/;
const MONTH_DAY_PART = /^(\d{1,2})\s*월\s*(\d{1,2})\s*일$/;

function newId() {
  return randomUUID();
}

function resolveScheduleIso(
  year: number,
  month0: number,
  day: number,
  now = new Date(),
) {
  const todayKey = getSeoulTodayKey(now);
  let y = year;
  let m = month0;
  let dateKey = seoulDateKey(y, m, day);

  if (dateKey < todayKey) {
    const next = addSeoulMonths(y, m, 1);
    y = next.year;
    m = next.month0;
    dateKey = seoulDateKey(y, m, day);
  }

  return seoulIsoFromDateAndTime(dateKey, "09:00");
}

function parseDayPart(part: string, ref = new Date()) {
  const trimmed = part.trim();
  const monthDay = trimmed.match(MONTH_DAY_PART);
  if (monthDay) {
    const month = Number(monthDay[1]);
    const day = Number(monthDay[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const { year } = getSeoulDateParts(ref);
    return resolveScheduleIso(year, month - 1, day, ref);
  }

  const dayOnly = trimmed.match(DAY_ONLY_PART);
  if (!dayOnly) return null;

  const day = Number(dayOnly[1]);
  if (day < 1 || day > 31) return null;

  const { year, month0 } = getSeoulDateParts(ref);
  return resolveScheduleIso(year, month0, day, ref);
}

export function parseMultiDayScheduleInput(
  line: string,
  viewSpace: ViewSpace,
  options?: { inferredSpace?: Space; now?: Date },
): InboxPreviewItem[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes(",")) return null;

  const spaceParsed = parseSpaceLinePrefix(trimmed, viewSpace, {
    inferredSpace: options?.inferredSpace,
  });
  const { forceKind, content } = parseLineTypePrefix(spaceParsed.content);
  if (forceKind && forceKind !== "schedule") return null;

  const body = content.trim();
  const parts = body
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  const title = parts[0];
  if (!title) return null;

  const dueAts: string[] = [];
  const ref = options?.now ?? new Date();
  for (const part of parts.slice(1)) {
    const dueAt = parseDayPart(part, ref);
    if (!dueAt) return null;
    dueAts.push(dueAt);
  }

  return dueAts.map((dueAt) => ({
    id: newId(),
    rawLine: line,
    kind: "schedule" as const,
    content: title,
    targetSpace: spaceParsed.targetSpace,
    dueAt,
    amount: null,
    currency: "KRW",
    groupName: null,
    tabLabel: INBOX_KIND_LABELS.schedule,
  }));
}

export function isMultiDayScheduleInput(line: string) {
  return parseMultiDayScheduleInput(line, "personal") !== null;
}
