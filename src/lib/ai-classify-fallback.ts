import { extractDueDate } from "./classify";
import type { AiInboxClassification } from "./ai-inbox-types";

const DEADLINE_PARTICLE = /까지|까진|까지는/;

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

/** Gemini 실패 시 날짜 규칙 기반 분류 (행동 동사 키워드 사용 안 함) */
export function classifyWithRules(text: string): AiInboxClassification {
  const trimmed = text.trim();
  const { date, cleaned } = extractDueDate(trimmed);

  if (DEADLINE_PARTICLE.test(trimmed)) {
    return {
      project: null,
      todos: [trimmed],
      schedules: [],
      notes: [],
    };
  }

  if (date) {
    return {
      project: null,
      todos: [],
      schedules: [
        {
          title: cleaned || trimmed,
          start_date: date.toISOString(),
        },
      ],
      notes: [],
    };
  }

  return {
    project: null,
    todos: [],
    schedules: [],
    notes: [trimmed],
  };
}
