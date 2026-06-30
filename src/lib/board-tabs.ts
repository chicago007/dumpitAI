import type { BoardMetadata, BoardTab, BoardTabConfig } from "@/lib/board-types";
import { BOARD_TABS } from "@/lib/board-types";

export function defaultBoardTabs(): BoardTabConfig[] {
  return BOARD_TABS.map((t) => ({
    id: t.id,
    kind: t.id,
    label: t.label,
  }));
}

export function resolveBoardTabs(
  metadata: BoardMetadata | null | undefined,
): BoardTabConfig[] {
  const stored = metadata?.boardTabs;
  if (stored && stored.length > 0) {
    return stored;
  }
  return defaultBoardTabs();
}

export function tabKindLabel(kind: BoardTab): string {
  return BOARD_TABS.find((t) => t.id === kind)?.label ?? kind;
}

export function availableTabKinds(tabs: BoardTabConfig[]): BoardTab[] {
  const used = new Set(tabs.map((t) => t.kind));
  return BOARD_TABS.map((t) => t.id).filter((kind) => !used.has(kind));
}
