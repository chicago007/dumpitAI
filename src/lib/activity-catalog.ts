import type { ActivityLog } from "@/lib/activity-types";

export interface CustomActivityType {
  key: string;
  label: string;
  color: string;
}

export interface ActivityTypeDefinition {
  key: string;
  label: string;
  color: string;
  builtin: boolean;
}

export const BUILTIN_ACTIVITY_TYPES: ActivityTypeDefinition[] = [
  { key: "reading", label: "독서", color: "#92400E", builtin: true },
  { key: "exercise", label: "운동", color: "#EF4444", builtin: true },
];

const CUSTOM_COLORS = [
  "#8B5CF6",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#6366F1",
];

export function isBuiltinActivityKey(key: string) {
  return key === "reading" || key === "exercise";
}

export function activityTypeForKey(key: string): ActivityLog["activity_type"] {
  return isBuiltinActivityKey(key) ? key : "custom";
}

export function buildActivityCatalog(
  customTypes: CustomActivityType[],
): ActivityTypeDefinition[] {
  return [...BUILTIN_ACTIVITY_TYPES, ...customTypes.map((t) => ({
    key: t.key,
    label: t.label,
    color: t.color,
    builtin: false,
  }))];
}

export function getActivityDefinition(
  catalog: ActivityTypeDefinition[],
  key: string,
): ActivityTypeDefinition {
  return (
    catalog.find((t) => t.key === key) ?? {
      key,
      label: key,
      color: "#6B7280",
      builtin: false,
    }
  );
}

export function pickCustomActivityColor(index: number) {
  return CUSTOM_COLORS[index % CUSTOM_COLORS.length];
}

export function createCustomActivityKey(label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  if (slug) return `custom_${slug}`;
  return `custom_${crypto.randomUUID().slice(0, 8)}`;
}

export function isValidCustomActivityTypes(data: unknown): data is CustomActivityType[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as CustomActivityType).key === "string" &&
      typeof (item as CustomActivityType).label === "string" &&
      typeof (item as CustomActivityType).color === "string" &&
      (item as CustomActivityType).label.trim().length > 0,
  );
}

export function catalogKeys(catalog: ActivityTypeDefinition[]) {
  return catalog.map((t) => t.key);
}
