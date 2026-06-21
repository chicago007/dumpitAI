import { extractDueDate } from "@/lib/classify";
import type { Entry } from "@/lib/types";
import {
  getAllTemplateItems,
  DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
  getTravelChecklistId,
  type TravelChecklistGroup,
  type TravelChecklistItem,
} from "@/lib/travel-checklist-template";
import {
  isBeachDestination,
  isInternationalDestination,
  normalizeDestination,
  parseDestination,
} from "@/lib/travel";

export type TravelSeason = "winter" | "spring" | "summer" | "autumn";

export interface TravelContext {
  destination: string;
  departureDate: Date | null;
  season: TravelSeason;
  isInternational: boolean;
  isBeach: boolean;
}

export interface ApplicableChecklistItem {
  item: TravelChecklistItem;
  groupName: string;
  reason?: string;
}

export interface ChecklistItemStatus {
  item: TravelChecklistItem;
  groupName: string;
  status: "done" | "pending" | "skipped";
  reason?: string;
  entryId?: string;
}

export interface TravelPlanStatus {
  context: TravelContext;
  title: string;
  applicable: ApplicableChecklistItem[];
  items: ChecklistItemStatus[];
  preparedCount: number;
  pendingCount: number;
  skippedCount: number;
  pendingItems: ChecklistItemStatus[];
}

interface ItemRule {
  defaultExcluded?: boolean;
  internationalOnly?: boolean;
  domesticOnly?: boolean;
  skipSeasons?: TravelSeason[];
  skipUnlessBeach?: boolean;
  optional?: boolean;
  note?: string;
}

const ITEM_RULES: Record<string, ItemRule> = {
  "basic-rental-car": { defaultExcluded: true },
  "basic-intl-license": { defaultExcluded: true },
  "basic-dom-license": { defaultExcluded: true },
  "basic-visa": { internationalOnly: true },
  "basic-exchange": { internationalOnly: true },
  "basic-roaming": { internationalOnly: true },
  "personal-adapter": { internationalOnly: true },
  "hygiene-sunscreen": { skipSeasons: ["winter"] },
  "personal-swimsuit": { skipUnlessBeach: true, skipSeasons: ["winter", "autumn", "spring"] },
  "personal-swimcap": { skipUnlessBeach: true, skipSeasons: ["winter", "autumn", "spring"] },
  "food-ramen": { internationalOnly: true },
  "food-gochujang": { internationalOnly: true },
  "food-soju": { internationalOnly: true },
  "food-rice": { internationalOnly: true },
  "food-kimchi": { internationalOnly: true },
  "food-water": { optional: true },
  "exercise-shoes": { optional: true },
  "exercise-clothes": { optional: true },
  "exercise-slippers": { optional: true },
  "medicine-bp": { optional: true, note: "필요 시" },
  "medicine-cholesterol": { optional: true, note: "필요 시" },
  "medicine-allergy": { optional: true, note: "필요 시" },
  "medicine-melatonin": { optional: true, note: "필요 시" },
};

const TRAVEL_INTENT_REGEX =
  /여행|출장|휴가|방문|놀러|여행가|가기|갈\s*거|다녀오|휴가다|휴가를|여행$/;

/** 여행과 무관한 금융·투자 표현 — 지역명만 있어도 여행으로 오인하지 않음 */
const NON_TRAVEL_REGEX =
  /주식|증권|투자|매수|매도|코스피|나스닥|배당|etf|펀드|주가|증시/i;

const SEASON_KEYWORDS: Record<string, TravelSeason> = {
  겨울: "winter",
  winter: "winter",
  여름: "summer",
  summer: "summer",
  봄: "spring",
  spring: "spring",
  가을: "autumn",
  autumn: "autumn",
  fall: "autumn",
};

export function inferSeason(
  date: Date | null,
  content: string,
): TravelSeason {
  for (const [keyword, season] of Object.entries(SEASON_KEYWORDS)) {
    if (content.includes(keyword)) return season;
  }
  if (!date) return "spring";
  const month = date.getMonth() + 1;
  if (month === 12 || month <= 2) return "winter";
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  return "autumn";
}

export function seasonLabel(season: TravelSeason) {
  const labels: Record<TravelSeason, string> = {
    winter: "겨울",
    spring: "봄",
    summer: "여름",
    autumn: "가을",
  };
  return labels[season];
}

export function parseTravelContext(
  content: string,
  destinationOverride?: string | null,
  dateOverride?: Date | null,
): TravelContext | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  if (NON_TRAVEL_REGEX.test(trimmed)) return null;

  const { date: extractedDate } = extractDueDate(trimmed);
  const destination =
    destinationOverride?.trim() ||
    parseDestination(trimmed) ||
    null;
  const departureDate = dateOverride ?? extractedDate;

  const hasIntent = TRAVEL_INTENT_REGEX.test(trimmed);
  if (!hasIntent) return null;
  if (!destination && !departureDate) return null;

  const normalizedDest = normalizeDestination(
    destination ?? "미지정",
  );

  return {
    destination: normalizedDest,
    departureDate,
    season: inferSeason(departureDate, trimmed),
    isInternational: isInternationalDestination(normalizedDest),
    isBeach: isBeachDestination(normalizedDest),
  };
}

export function isTravelIntent(content: string) {
  return parseTravelContext(content) !== null;
}

function getSkipReason(
  itemId: string,
  ctx: TravelContext,
  templateExcluded?: boolean,
): string | null {
  if (templateExcluded) return "이번 여행에 불필요";

  const rules = ITEM_RULES[itemId];
  if (!rules) return null;

  if (rules.defaultExcluded) return "이번 여행에 불필요";
  if (rules.internationalOnly && !ctx.isInternational) return "국내 여행";
  if (rules.domesticOnly && ctx.isInternational) return "해외 여행";
  if (rules.skipSeasons?.includes(ctx.season)) {
    return `${seasonLabel(ctx.season)}에는 불필요`;
  }
  if (rules.skipUnlessBeach && !ctx.isBeach && ctx.season !== "summer") {
    return "해변·수영 일정 없음";
  }

  return null;
}

export function getApplicableItems(
  ctx: TravelContext,
  template: TravelChecklistGroup[] = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
): ApplicableChecklistItem[] {
  const result: ApplicableChecklistItem[] = [];

  for (const { item, groupName } of getAllTemplateItems(template)) {
    const skipReason = getSkipReason(item.id, ctx, item.excluded);
    if (skipReason) continue;

    const rules = ITEM_RULES[item.id];
    result.push({
      item,
      groupName,
      reason: rules?.note,
    });
  }

  return result;
}

function findMatchingEntry(
  itemId: string,
  entries: Entry[],
  destination: string,
) {
  return entries.find((entry) => {
    const checklistId = getTravelChecklistId(entry.metadata ?? {});
    if (checklistId !== itemId) return false;

    const entryDest =
      typeof entry.metadata?.destination === "string"
        ? entry.metadata.destination
        : null;
    if (entryDest && entryDest !== destination) return false;

    return true;
  });
}

export function buildTravelPlanStatus(
  content: string,
  entries: Entry[],
  destinationOverride?: string | null,
  dateOverride?: Date | null,
  template?: TravelChecklistGroup[],
): TravelPlanStatus | null {
  const ctx = parseTravelContext(content, destinationOverride, dateOverride);
  if (!ctx) return null;

  const applicable = getApplicableItems(ctx, template);
  const prepEntries = entries.filter(
    (e) => e.type === "todo" || e.type === "checklist",
  );

  const items: ChecklistItemStatus[] = [];

  for (const { item, groupName } of getAllTemplateItems(template)) {
    const skipReason = getSkipReason(item.id, ctx, item.excluded);
    if (skipReason) {
      items.push({
        item,
        groupName,
        status: "skipped",
        reason: skipReason,
      });
      continue;
    }

    const matched = findMatchingEntry(
      item.id,
      prepEntries,
      ctx.destination,
    );

    if (matched?.status === "done") {
      items.push({
        item,
        groupName,
        status: "done",
        entryId: matched.id,
      });
    } else if (matched) {
      items.push({
        item,
        groupName,
        status: "pending",
        entryId: matched.id,
      });
    } else {
      items.push({
        item,
        groupName,
        status: "pending",
      });
    }
  }

  const actionable = items.filter((i) => i.status !== "skipped");
  const preparedCount = actionable.filter((i) => i.status === "done").length;
  const pendingItems = actionable.filter((i) => i.status === "pending");

  return {
    context: ctx,
    title: buildTravelTitle(ctx),
    applicable,
    items,
    preparedCount,
    pendingCount: pendingItems.length,
    skippedCount: items.filter((i) => i.status === "skipped").length,
    pendingItems,
  };
}

export function buildTravelTitle(ctx: TravelContext) {
  const parts: string[] = [];
  if (ctx.departureDate) {
    parts.push(
      ctx.departureDate.toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      }),
    );
  }
  parts.push(ctx.destination);
  parts.push("여행");
  return parts.join(" ");
}

export function getTravelPlanId(metadata: Record<string, unknown>) {
  const id = metadata.travelPlanId;
  return typeof id === "string" ? id : null;
}

export function isTravelPlanEntry(metadata: Record<string, unknown>) {
  return metadata.travelPlan === true;
}

export function formatDepartureLabel(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export interface DetectedTravelEntry {
  entry: Entry;
  status: TravelPlanStatus;
}

/** 저장된 메모·할일 등에서 여행 의도를 찾음 */
export function findDetectedTravelEntries(
  entries: Entry[],
  existingPlans: Entry[],
  prepEntries: Entry[],
  template?: TravelChecklistGroup[],
): DetectedTravelEntry[] {
  const plannedDestinations = new Set(
    existingPlans
      .map((plan) =>
        typeof plan.metadata?.destination === "string"
          ? plan.metadata.destination
          : null,
      )
      .filter((dest): dest is string => !!dest),
  );

  const seenDestinations = new Set<string>();
  const results: DetectedTravelEntry[] = [];

  for (const entry of entries) {
    if (entry.status !== "active") continue;
    if (isTravelPlanEntry(entry.metadata ?? {})) continue;

    const departureDate = entry.due_at ? new Date(entry.due_at) : null;
    const ctx = parseTravelContext(entry.content, null, departureDate);
    if (!ctx) continue;

    if (plannedDestinations.has(ctx.destination)) continue;
    if (seenDestinations.has(ctx.destination)) continue;
    seenDestinations.add(ctx.destination);

    const status = buildTravelPlanStatus(
      entry.content,
      prepEntries,
      ctx.destination,
      ctx.departureDate ?? departureDate,
      template,
    );
    if (!status) continue;

    results.push({ entry, status });
  }

  return results;
}

export interface TravelPrepTodoGroup {
  id: string;
  title: string;
  entries: Entry[];
  dueAt: string | null;
}

export function isTravelPrepEntry(entry: Entry) {
  const meta = entry.metadata ?? {};
  if (meta.fromTravelChecklist === true) return true;
  return typeof meta.travelChecklistId === "string";
}

function buildPrepGroupTitle(plan: Entry | undefined, sample: Entry) {
  if (plan?.content?.trim()) {
    const content = plan.content.trim();
    if (content.endsWith("준비")) return content;
    if (content.includes("여행")) return `${content} 준비`;
    return `${content} 여행 준비`;
  }

  const meta = sample.metadata ?? {};
  const destination =
    typeof meta.destination === "string" ? meta.destination : null;
  const dueLabel = sample.due_at
    ? formatDepartureLabel(new Date(sample.due_at))
    : null;

  if (dueLabel && destination) return `${dueLabel} ${destination} 여행 준비`;
  if (destination) return `${destination} 여행 준비`;
  if (dueLabel) return `${dueLabel} 여행 준비`;
  return "여행 준비";
}

export function groupTravelPrepTodos(
  todos: Entry[],
  plans: Entry[],
): { groups: TravelPrepTodoGroup[]; otherTodos: Entry[] } {
  const prepTodos = todos.filter(isTravelPrepEntry);
  const otherTodos = todos.filter((e) => !isTravelPrepEntry(e));

  const byKey = new Map<string, Entry[]>();

  for (const todo of prepTodos) {
    const meta = todo.metadata ?? {};
    const planId = getTravelPlanId(meta);
    const destination =
      typeof meta.destination === "string" ? meta.destination : "unknown";
    const dueKey = todo.due_at ?? "no-date";
    const key = planId ?? `dest:${destination}:${dueKey}`;

    const list = byKey.get(key) ?? [];
    list.push(todo);
    byKey.set(key, list);
  }

  const groups: TravelPrepTodoGroup[] = [];

  for (const [id, entries] of byKey) {
    const plan = plans.find((p) => getTravelPlanId(p.metadata ?? {}) === id);
    const sample = entries[0];
    groups.push({
      id,
      title: buildPrepGroupTitle(plan, sample),
      entries,
      dueAt: plan?.due_at ?? sample.due_at,
    });
  }

  groups.sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt);
  });

  return { groups, otherTodos };
}
