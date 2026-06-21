import type { Entry } from "@/lib/types";

const TRACKABLE_TYPES = new Set(["todo", "checklist"]);

export function computeBoardProgress(entries: Entry[]) {
  const trackable = entries.filter((e) => TRACKABLE_TYPES.has(e.type));
  const total = trackable.length;
  if (total === 0) return 0;
  const done = trackable.filter((e) => e.status === "done").length;
  return Math.round((done / total) * 100);
}

export function computeOverallProgress(
  boards: { progress: number; total: number }[],
) {
  const withItems = boards.filter((b) => b.total > 0);
  if (withItems.length === 0) return 0;
  const sum = withItems.reduce((acc, b) => acc + b.progress, 0);
  return Math.round(sum / withItems.length);
}
