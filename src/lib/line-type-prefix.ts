import {
  INBOX_PREFIX_ALIASES,
  type InboxItemKind,
} from "@/lib/ai-inbox-types";

export function parseLineTypePrefix(line: string): {
  forceKind: InboxItemKind | null;
  content: string;
} {
  const trimmed = line.trim();
  if (!trimmed.startsWith("@")) {
    return { forceKind: null, content: trimmed };
  }

  const rest = trimmed.slice(1);
  const keys = Object.keys(INBOX_PREFIX_ALIASES).sort(
    (a, b) => b.length - a.length,
  );

  for (const key of keys) {
    if (!rest.toLowerCase().startsWith(key.toLowerCase())) continue;

    const afterKey = rest.slice(key.length);
    const content = afterKey.trim();

    return {
      forceKind: INBOX_PREFIX_ALIASES[key],
      content: content || trimmed,
    };
  }

  return { forceKind: null, content: trimmed };
}
