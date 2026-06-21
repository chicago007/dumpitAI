import type { BoardMetadata } from "@/lib/board-types";
import type { Entry } from "@/lib/types";

export function getChecklistItemOrder(
  metadata: BoardMetadata,
): Record<string, string[]> {
  return metadata.checklistItemOrder ?? {};
}

export function sortEntriesByChecklistOrder(
  entries: Entry[],
  groupId: string,
  orderMap: Record<string, string[]>,
): Entry[] {
  const order = orderMap[groupId];
  if (!order?.length) {
    return [...entries].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  const byId = new Map(entries.map((e) => [e.id, e]));
  const sorted: Entry[] = [];
  const seen = new Set<string>();

  for (const id of order) {
    const entry = byId.get(id);
    if (entry) {
      sorted.push(entry);
      seen.add(id);
    }
  }

  for (const entry of entries) {
    if (!seen.has(entry.id)) sorted.push(entry);
  }

  return sorted;
}

export function appendToGroupOrder(
  order: Record<string, string[]>,
  groupId: string,
  entryIds: string[],
): Record<string, string[]> {
  const next = { ...order };
  const groupOrder = [...(next[groupId] ?? [])];
  for (const id of entryIds) {
    if (!groupOrder.includes(id)) groupOrder.push(id);
  }
  next[groupId] = groupOrder;
  return next;
}

export function removeFromGroupOrder(
  order: Record<string, string[]>,
  groupId: string,
  entryId: string,
): Record<string, string[]> {
  const next = { ...order };
  const groupOrder = next[groupId];
  if (!groupOrder) return next;
  next[groupId] = groupOrder.filter((id) => id !== entryId);
  return next;
}

export function reorderGroupOrder(
  order: Record<string, string[]>,
  groupId: string,
  orderedEntryIds: string[],
): Record<string, string[]> {
  return { ...order, [groupId]: orderedEntryIds };
}
