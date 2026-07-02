import { classifyWithAI } from "@/lib/ai-classify";
import { classifyWithRules } from "@/lib/ai-classify-fallback";
import {
  finalizeInboxClassification,
  mergeClassifications,
  normalizeLineClassification,
  parseInboxBlocks,
  parseLineTypePrefix,
} from "@/lib/ai-inbox-normalize";
import type {
  AiInboxClassification,
  InboxItemKind,
  InboxPreviewItem,
  InboxPreviewResult,
} from "@/lib/ai-inbox-types";
import { INBOX_KIND_LABELS } from "@/lib/ai-inbox-types";
import {
  classifyBoardInput,
  type BoardClassifyResult,
} from "@/lib/board-classify";
import { formatBoardDateRangeKo, parseBoardDateRange } from "@/lib/board-date-range";
import { parseBoardMoney, stripMoneyFromContent } from "@/lib/board-money";
import { extractDueDate } from "@/lib/classify";
import { parseMultiDayScheduleInput } from "@/lib/multi-day-schedule-input";
import { parseSpaceLinePrefix } from "@/lib/space-input";
import { inferSpaceForAllView, type SpaceInferSource } from "@/lib/space-infer";
import type { Space, ViewSpace } from "@/lib/spaces";

const DEADLINE_PARTICLE = /까지|까진|까지는/;

function newId() {
  return crypto.randomUUID();
}

function tabLabel(kind: InboxItemKind) {
  return INBOX_KIND_LABELS[kind];
}

function boardKindToInboxKind(kind: BoardClassifyResult["kind"]): InboxItemKind {
  return kind;
}

function fromBoardResult(
  rawLine: string,
  result: BoardClassifyResult,
  targetSpace: Space,
): InboxPreviewItem {
  const periodLabel =
    result.startDate && result.endDate
      ? formatBoardDateRangeKo(result.startDate, result.endDate)
      : null;

  return {
    id: newId(),
    rawLine,
    kind: boardKindToInboxKind(result.kind),
    content:
      result.kind === "period"
        ? periodLabel ?? rawLine
        : result.cleanedContent,
    targetSpace,
    dueAt: result.dueAt?.toISOString() ?? null,
    startDate: result.startDate ?? null,
    endDate: result.endDate ?? null,
    amount: result.amount,
    currency: result.currency,
    groupName: result.groupName ?? null,
    tabLabel: tabLabel(boardKindToInboxKind(result.kind)),
  };
}

function resolveForcedKind(
  kind: InboxItemKind,
  isProjectBlock: boolean,
): InboxItemKind {
  if (isProjectBlock) {
    if (kind === "todo") return "checklist";
    return kind;
  }

  switch (kind) {
    case "checklist":
      return "todo";
    case "budget":
    case "expense":
    case "period":
      return "memo";
    default:
      return kind;
  }
}

function fromForcedKind(
  rawLine: string,
  content: string,
  kind: InboxItemKind,
  isProjectBlock: boolean,
  targetSpace: Space,
): InboxPreviewItem {
  const { date, cleaned } = extractDueDate(content);
  const text = cleaned || content;
  const resolvedKind = resolveForcedKind(kind, isProjectBlock);

  let amount: number | null = null;
  let currency = "KRW";
  let startDate: string | null = null;
  let endDate: string | null = null;
  let displayContent = text;

  if (resolvedKind === "period") {
    const range = parseBoardDateRange(content);
    if (range) {
      startDate = range.startDate;
      endDate = range.endDate;
      displayContent =
        formatBoardDateRangeKo(range.startDate, range.endDate) ?? text;
    }
  } else if (resolvedKind === "budget" || resolvedKind === "expense") {
    const money = parseBoardMoney(content);
    amount = money.amount;
    currency = money.currency;
    displayContent = stripMoneyFromContent(text) || text;
  }

  return {
    id: newId(),
    rawLine,
    kind: resolvedKind,
    targetSpace,
    content: displayContent,
    dueAt: date?.toISOString() ?? null,
    startDate,
    endDate,
    amount,
    currency,
    groupName: null,
    tabLabel: tabLabel(resolvedKind),
  };
}

function fromInboxClassification(
  rawLine: string,
  classification: AiInboxClassification,
  targetSpace: Space,
): InboxPreviewItem[] {
  const items: InboxPreviewItem[] = [];

  for (const todo of classification.todos) {
    const m = todo.match(/^__due__(.+?)__(.+)$/);
    items.push({
      id: newId(),
      rawLine,
      kind: "todo",
      content: m ? m[2].trim() : todo,
      targetSpace,
      dueAt: m ? m[1] : null,
      amount: null,
      currency: "KRW",
      groupName: null,
      tabLabel: tabLabel("todo"),
    });
  }

  for (const schedule of classification.schedules) {
    items.push({
      id: newId(),
      rawLine,
      kind: "schedule",
      content: schedule.title,
      targetSpace,
      dueAt: schedule.start_date,
      amount: null,
      currency: "KRW",
      groupName: null,
      tabLabel: tabLabel("schedule"),
    });
  }

  for (const note of classification.notes) {
    items.push({
      id: newId(),
      rawLine,
      kind: "memo",
      content: note,
      targetSpace,
      dueAt: null,
      amount: null,
      currency: "KRW",
      groupName: null,
      tabLabel: tabLabel("memo"),
    });
  }

  if (classification.project && items.length === 0) {
    return [];
  }

  if (items.length === 0) {
    const { date, cleaned } = extractDueDate(rawLine);
    if (DEADLINE_PARTICLE.test(rawLine)) {
      return [
        {
          id: newId(),
          rawLine,
          kind: "todo",
          content: cleaned || rawLine,
          targetSpace,
          dueAt: date?.toISOString() ?? null,
          amount: null,
          currency: "KRW",
          groupName: null,
          tabLabel: tabLabel("todo"),
        },
      ];
    }
    if (date) {
      return [
        {
          id: newId(),
          rawLine,
          kind: "schedule",
          content: cleaned || rawLine,
          targetSpace,
          dueAt: date.toISOString(),
          amount: null,
          currency: "KRW",
          groupName: null,
          tabLabel: tabLabel("schedule"),
        },
      ];
    }
    return [
      {
        id: newId(),
        rawLine,
        kind: "memo",
        content: rawLine,
        targetSpace,
        dueAt: null,
        amount: null,
        currency: "KRW",
        groupName: null,
        tabLabel: tabLabel("memo"),
      },
    ];
  }

  return items;
}

async function classifyInboxLine(
  line: string,
  userId?: string,
): Promise<AiInboxClassification> {
  let raw: AiInboxClassification;
  try {
    raw = await classifyWithAI(line, userId);
  } catch {
    raw = classifyWithRules(line);
  }
  return normalizeLineClassification(line, raw);
}

async function classifyLineForPreview(
  line: string,
  isProjectBlock: boolean,
  viewSpace: ViewSpace,
  userId?: string,
): Promise<{
  items: InboxPreviewItem[];
  classification?: AiInboxClassification;
  spaceInferred: boolean;
  inferSource?: SpaceInferSource;
}> {
  const trimmed = line.trim();
  const hasPrefix = /^\/(업|업무|개|개인)\s/.test(trimmed);

  let inferredSpace: Space | undefined;
  let inferSource: SpaceInferSource | undefined;

  if (viewSpace === "all" && !hasPrefix) {
    const inferred = await inferSpaceForAllView(trimmed, userId);
    inferredSpace = inferred.space;
    inferSource = inferred.source;
  }

  const spaceParsed = parseSpaceLinePrefix(line, viewSpace, { inferredSpace });
  const spaceInferred = Boolean(spaceParsed.inferred);

  const multiDaySchedules = parseMultiDayScheduleInput(line, viewSpace, {
    inferredSpace,
  });
  if (multiDaySchedules && !isProjectBlock) {
    return {
      items: multiDaySchedules,
      spaceInferred,
      inferSource,
    };
  }

  const { forceKind, content } = parseLineTypePrefix(spaceParsed.content);
  const body = content || spaceParsed.content;
  const targetSpace = spaceParsed.targetSpace;

  if (isProjectBlock) {
    if (forceKind) {
      return {
        items: [fromForcedKind(line, body, forceKind, true, targetSpace)],
        spaceInferred,
        inferSource,
      };
    }
    return {
      items: [fromBoardResult(line, classifyBoardInput(body), targetSpace)],
      spaceInferred,
      inferSource,
    };
  }

  if (forceKind) {
    return {
      items: [fromForcedKind(line, body, forceKind, false, targetSpace)],
      spaceInferred,
      inferSource,
    };
  }

  const classification = await classifyInboxLine(body, userId);
  return {
    items: fromInboxClassification(line, classification, targetSpace),
    classification,
    spaceInferred,
    inferSource,
  };
}

export async function buildInboxPreview(
  text: string,
  viewSpace: ViewSpace,
  userId?: string,
): Promise<InboxPreviewResult> {
  const trimmed = text.trim();
  const { explicitProject, lines } = parseInboxBlocks(trimmed);
  const isProjectBlock = Boolean(explicitProject);
  const targets = lines.length > 0 ? lines : trimmed ? [trimmed] : [];

  const items: InboxPreviewItem[] = [];
  let inferredProject: string | null = explicitProject;
  let needsSpaceConfirm = false;
  let suggestedSpace: Space | undefined;

  if (isProjectBlock && targets.length === 0) {
    return {
      project: explicitProject,
      isProjectBlock: true,
      items: [],
      originalText: trimmed,
      needsSpaceConfirm: viewSpace === "all",
      suggestedSpace: viewSpace === "all" ? "personal" : undefined,
    };
  }

  const lineClassifications: AiInboxClassification[] = [];

  for (const line of targets) {
    const lineResult = await classifyLineForPreview(
      line,
      isProjectBlock,
      viewSpace,
      userId,
    );
    items.push(...lineResult.items);
    if (lineResult.classification) {
      lineClassifications.push(lineResult.classification);
    }

    if (lineResult.spaceInferred) {
      needsSpaceConfirm = true;
      if (!suggestedSpace) {
        suggestedSpace = lineResult.items[0]?.targetSpace;
      }
    }

    if (!inferredProject) {
      const travel = line.match(
        /(?:\d{1,2}\s*월\s*\d{1,2}\s*일\s*)?([가-힣A-Za-z0-9]+여행)\s*$/,
      );
      if (travel && !DEADLINE_PARTICLE.test(line)) {
        inferredProject = travel[1];
      }
    }
  }

  if (!explicitProject && targets.length > 1 && lineClassifications.length > 0) {
    const merged = finalizeInboxClassification(
      targets,
      mergeClassifications(lineClassifications),
    );
    if (merged.project) inferredProject = merged.project;
  }

  return {
    project: explicitProject ?? inferredProject,
    isProjectBlock,
    items,
    originalText: trimmed,
    needsSpaceConfirm: viewSpace === "all" && needsSpaceConfirm,
    suggestedSpace,
  };
}

export function previewToClassification(
  preview: InboxPreviewResult,
): AiInboxClassification {
  const classification: AiInboxClassification = {
    project: preview.project,
    todos: [],
    schedules: [],
    notes: [],
  };

  for (const item of preview.items) {
    const payload =
      item.dueAt && item.kind === "todo"
        ? `__due__${item.dueAt}__${item.content}`
        : item.content;

    switch (item.kind) {
      case "todo":
      case "checklist":
        classification.todos.push(payload);
        break;
      case "schedule":
        classification.schedules.push({
          title: item.content,
          start_date: item.dueAt,
        });
        break;
      case "memo":
      case "budget":
      case "expense":
      case "period":
        classification.notes.push(item.content);
        break;
    }
  }

  return classification;
}
