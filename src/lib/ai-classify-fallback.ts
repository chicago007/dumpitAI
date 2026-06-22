import type { Category } from "./types";
import { classifyContent } from "./classify";
import type { AiInboxClassification } from "./ai-inbox-types";

/** Gemini API 오류를 사용자용 메시지로 변환 */
export function formatGeminiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    return (
      "Gemini API 사용 한도를 초과했습니다. " +
      "잠시 후 다시 시도하거나 Google AI Studio에서 요금제·한도를 확인해 주세요."
    );
  }
  if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
    return (
      "Gemini API 키가 올바르지 않습니다. " +
      "Google AI Studio에서 API 키를 다시 발급해 .env.local에 넣어 주세요."
    );
  }
  if (message.includes("GEMINI_API_KEY")) {
    return message;
  }

  return `AI 분석에 실패했습니다: ${message.slice(0, 200)}`;
}

/** Gemini 실패 시 키워드 기반 분류로 대체 */
export function classifyWithRules(
  text: string,
  categories: Category[],
): AiInboxClassification {
  const trimmed = text.trim();
  const result = classifyContent(trimmed, categories);

  const classification: AiInboxClassification = {
    project: null,
    todos: [],
    schedules: [],
    notes: [],
  };

  if (result.type === "todo" || result.type === "checklist") {
    classification.todos.push(trimmed);
  } else if (result.type === "schedule") {
    classification.schedules.push({
      title: trimmed,
      start_date: result.dueAt?.toISOString() ?? null,
    });
  } else {
    classification.notes.push(trimmed);
  }

  return classification;
}
