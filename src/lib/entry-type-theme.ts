import type { EntryType } from "@/lib/types";

export interface EntryTypeTheme {
  color: string;
  label: string;
  href: string;
}

export const ENTRY_TYPE_THEMES: Record<EntryType, EntryTypeTheme> = {
  memo: {
    color: "#f59e0b",
    label: "메모",
    href: "/memo",
  },
  todo: {
    color: "#007aff",
    label: "할일",
    href: "/todo",
  },
  schedule: {
    color: "#8b5cf6",
    label: "일정",
    href: "/schedule",
  },
  checklist: {
    color: "#10b981",
    label: "체크리스트",
    href: "/checklist",
  },
};

export function getEntryTypeTheme(type: EntryType): EntryTypeTheme {
  return ENTRY_TYPE_THEMES[type];
}
