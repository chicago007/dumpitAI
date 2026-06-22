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
import { parseBoardMoney, stripMoneyFromContent } from "@/lib/board-money";
import { extractDueDate } from "@/lib/classify";

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
): InboxPreviewItem {
  return {
    id: newId(),
    rawLine,
    kind: boardKindToInboxKind(result.kind),
    content: result.cleanedContent,
    dueAt: result.dueAt?.toISOString() ?? null,
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
): InboxPreviewItem {
  const { date, cleaned } = extractDueDate(content);
  const text = cleaned || content;
  const resolvedKind = resolveForcedKind(kind, isProjectBlock);

  let amount: number | null = null;
  let currency = "KRW";
  if (resolvedKind === "budget" || resolvedKind === "expense") {
    const money = parseBoardMoney(content);
    amount = money.amount;
    currency = money.currency;
  }

  return {
    id: newId(),
    rawLine,
    kind: resolvedKind,
    content:
      resolvedKind === "budget" || resolvedKind === "expense"
        ? stripMoneyFromContent(text) || text
        : text,
    dueAt: date?.toISOString() ?? null,
    amount,
    currency,
    groupName: null,
    tabLabel: tabLabel(resolvedKind),
  };
}

function fromInboxClassification(
  rawLine: string,
  classification: AiInboxClassification,
): InboxPreviewItem[] {
  const items: InboxPreviewItem[] = [];

  for (const todo of classification.todos) {
    const m = todo.match(/^__due__(.+?)__(.+)$/);
    items.push({
      id: newId(),
      rawLine,
      kind: "todo",
      content: m ? m[2].trim() : todo,
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
): Promise<AiInboxClassification> {
  let raw: AiInboxClassification;
  try {
    raw = await classifyWithAI(line);
  } catch {
    raw = classifyWithRules(line);
  }
  return normalizeLineClassification(line, raw);
}

async function classifyLineForPreview(
  line: string,
  isProjectBlock: boolean,
): Promise<InboxPreviewItem[]> {
  const { forceKind, content } = parseLineTypePrefix(line);
  const body = content || line;

  if (isProjectBlock) {
    if (forceKind) {
      return [fromForcedKind(line, body, forceKind, true)];
    }
    return [fromBoardResult(line, classifyBoardInput(body))];
  }

  if (forceKind) {
    return [fromForcedKind(line, body, forceKind, false)];
  }

  const classification = await classifyInboxLine(line);
  return fromInboxClassification(line, classification);
}

export async function buildInboxPreview(text: string): Promise<InboxPreviewResult> {
  const trimmed = text.trim();
  const { explicitProject, lines } = parseInboxBlocks(trimmed);
  const isProjectBlock = Boolean(explicitProject);
  const targets = lines.length > 0 ? lines : trimmed ? [trimmed] : [];

  const items: InboxPreviewItem[] = [];
  let inferredProject: string | null = explicitProject;

  if (isProjectBlock && targets.length === 0) {
    return {
      project: explicitProject,
      isProjectBlock: true,
      items: [],
      originalText: trimmed,
    };
  }

  for (const line of targets) {
    const lineItems = await classifyLineForPreview(line, isProjectBlock);
    items.push(...lineItems);

    if (!inferredProject) {
      const travel = line.match(
        /(?:\d{1,2}\s*월\s*\d{1,2}\s*일\s*)?([가-힣A-Za-z0-9]+여행)\s*$/,
      );
      if (travel && !DEADLINE_PARTICLE.test(line)) {
        inferredProject = travel[1];
      }
    }
  }

  if (!explicitProject && targets.length > 1) {
    const parts: AiInboxClassification[] = [];
    for (const line of targets) {
      parts.push(await classifyInboxLine(line));
    }
    const merged = finalizeInboxClassification(
      targets,
      mergeClassifications(parts),
    );
    if (merged.project) inferredProject = merged.project;
  }

  return {
    project: explicitProject ?? inferredProject,
    isProjectBlock,
    items,
    originalText: trimmed,
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
        classification.notes.push(item.content);
        break;
    }
  }

  return classification;
}
