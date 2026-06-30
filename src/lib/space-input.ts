import type { Space, ViewSpace } from "@/lib/spaces";
import { inferSpaceFromRules } from "@/lib/space-infer";

const SPACE_LINE_PREFIX = /^\/(업|업무|개|개인)\s*(.*)$/;

export interface ParsedSpaceInput {
  targetSpace: Space;
  content: string;
  hadPrefix: boolean;
  /** /업무 /개인 없이 추정한 경우 */
  inferred?: boolean;
}

/** 줄 앞 `/업` `/업무` `/개` `/개인` 파싱 — 전체 보기에서는 규칙으로 공간 추정 */
export function parseSpaceLinePrefix(
  text: string,
  viewSpace: ViewSpace,
  options?: { inferredSpace?: Space },
): ParsedSpaceInput {
  const trimmed = text.trim();
  const match = trimmed.match(SPACE_LINE_PREFIX);

  if (match) {
    const isWork = match[1] === "업" || match[1] === "업무";
    const content = match[2].trim();
    return {
      targetSpace: isWork ? "work" : "personal",
      content: content || trimmed,
      hadPrefix: true,
      inferred: false,
    };
  }

  if (viewSpace === "all") {
    const targetSpace =
      options?.inferredSpace ?? inferSpaceFromRules(trimmed) ?? "personal";
    return {
      targetSpace,
      content: trimmed,
      hadPrefix: false,
      inferred: true,
    };
  }

  return {
    targetSpace: viewSpace,
    content: trimmed,
    hadPrefix: false,
    inferred: false,
  };
}

export function parseSpaceInputPrefix(
  text: string,
  viewSpace: ViewSpace,
  options?: { inferredSpace?: Space },
): ParsedSpaceInput {
  const firstLine = text.split("\n")[0] ?? text;
  const parsed = parseSpaceLinePrefix(firstLine, viewSpace, options);

  if (parsed.hadPrefix) {
    const lines = text.split("\n");
    lines[0] = parsed.content;
    return {
      ...parsed,
      content: lines.join("\n").trim(),
    };
  }

  return parsed;
}
