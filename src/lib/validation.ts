import { z } from "zod";

const uuid = z.string().uuid();
const space = z.enum(["work", "personal"]);
const entryType = z.enum(["memo", "todo", "schedule", "checklist"]);
const finiteAmount = z
  .number()
  .finite()
  .min(0)
  .max(1_000_000_000_000);

export const inboxPreviewItemSchema = z.object({
  id: z.string().min(1).max(64),
  rawLine: z.string().max(2000),
  kind: z.enum([
    "todo",
    "schedule",
    "memo",
    "checklist",
    "budget",
    "expense",
    "period",
  ]),
  content: z.string().min(1).max(2000),
  targetSpace: space,
  dueAt: z.string().max(64).nullable(),
  startDate: z.string().max(32).nullable().optional(),
  endDate: z.string().max(32).nullable().optional(),
  amount: finiteAmount.nullable(),
  currency: z.string().max(8).default("KRW"),
  groupName: z.string().max(200).nullable().default(null),
  tabLabel: z.string().max(32),
});

export const inboxPreviewSchema = z.object({
  project: z.string().max(200).nullable(),
  isProjectBlock: z.boolean(),
  items: z.array(inboxPreviewItemSchema).max(100),
  originalText: z.string().min(1).max(20_000),
  needsSpaceConfirm: z.boolean().optional(),
  suggestedSpace: space.optional(),
});

export const createEntrySchema = z.object({
  content: z.string().trim().min(1).max(2000),
  type: entryType,
  categoryId: uuid,
  dueAt: z.string().max(64).nullable().optional(),
  learnKeyword: z.boolean().optional(),
  destination: z.string().max(200).nullable().optional(),
  amount: finiteAmount.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  space: space.optional(),
  boardId: uuid.nullable().optional(),
});

export const updateEntrySchema = z.object({
  id: uuid,
  content: z.string().trim().min(1).max(2000),
  type: entryType,
  categoryId: uuid,
  dueAt: z.string().max(64).nullable().optional(),
  destination: z.string().max(200).nullable().optional(),
  amount: finiteAmount.nullable().optional(),
});

export const createBoardWizardSchema = z.object({
  name: z.string().trim().min(1).max(200),
  color: z.string().max(32).optional(),
  space: space.optional(),
  projectType: z.enum([
    "travel",
    "business",
    "camping",
    "study",
    "work",
    "custom",
  ]),
  startDate: z.string().max(32).nullable().optional(),
  endDate: z.string().max(32).nullable().optional(),
  budgetTotal: finiteAmount.optional(),
  destination: z.string().max(200).optional(),
  season: z.string().max(100).optional(),
  customTypeLabel: z.string().max(100).optional(),
  defaultCategoryId: z.string().max(64),
  skipItems: z.boolean().optional(),
});

export const inboxTextSchema = z.string().trim().min(1).max(20_000);

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? "입력 값이 올바르지 않습니다.";
    throw new Error(msg);
  }
  return result.data;
}
