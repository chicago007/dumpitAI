import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import type { AiInboxClassification } from "./ai-inbox-types";
import { formatGeminiError } from "./ai-classify-fallback";
import { assertAiRateLimit } from "@/lib/ai-rate-limit";
import { getSeoulTodayKey } from "@/lib/dates";

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    project: {
      type: SchemaType.STRING,
      nullable: true,
      description:
        "프로젝트/보드 이름. 여러 할일·일정이 묶이는 주제가 있을 때만 설정.",
    },
    todos: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "할일 목록. '~해야 함', '예약', '준비' 등 실행 항목.",
    },
    schedules: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          start_date: {
            type: SchemaType.STRING,
            nullable: true,
            description: "ISO 8601 날짜시간. 파싱 불가 시 null.",
          },
        },
        required: ["title", "start_date"],
      },
      description: "일정 목록. 특정 시각·날짜가 있는 약속·미팅.",
    },
    notes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "메모. 참고 정보나 아이디어.",
    },
  },
  required: ["project", "todos", "schedules", "notes"],
};

const SYSTEM_PROMPT_BASE = `당신은 한국어 생각 입력을 분류하는 비서입니다.
사용자 입력을 분석해 프로젝트, 할일, 일정, 메모로 나눕니다.

규칙:
- 여러 줄이면 각 줄을 별도 항목으로 처리합니다.
- 첫 줄이 "프로젝트 이름", "@p 이름", "@프로젝트 이름"이면 project에 이름을 넣고, 나머지 줄만 분류합니다.
- "@할일", "@t"는 할일, "@일정", "@s"는 일정, "@메모", "@m"은 메모로 강제 분류합니다 (접두어는 제목에서 제거).
- "@체크리스트", "@예산", "@지출"은 프로젝트 블록 안에서 해당 탭으로 분류합니다.
- 날짜만 있고 "~까지"가 없으면 schedules(일정)입니다. 예: "오늘 회의", "29일 점검"
- "~까지", "~까진"이 붙으면 todos(할일)입니다. 예: "오늘까지 보고서", "29일까지 제출"
- "오늘", "내일" 등 상대 날짜는 ISO 8601로 변환하고, 제목에서는 날짜 단어를 제거합니다.
- "8월10일 동경여행"처럼 여행·출장 주제만 있으면 project에 넣습니다 (일정 아님).
- 여러 줄에 같은 주제(부동산랩 등)가 반복되면 project에 묶습니다.
- 특정 시각 약속·미팅은 schedules에 넣습니다.
- 참고·아이디어·예산 금액 등은 notes입니다.
- 행동 동사만으로 할일을 추측하지 마세요. 날짜와 "~까지" 규칙을 우선합니다.`;

function buildSystemPrompt() {
  const today = getSeoulTodayKey();
  return `${SYSTEM_PROMPT_BASE}
- 오늘 날짜: ${today}
- 빈 배열은 []로, 프로젝트가 없으면 project는 null입니다.`;
}

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY가 설정되지 않았습니다. .env.local에 추가해 주세요.",
    );
  }
  return apiKey;
}

function parseClassification(raw: string): AiInboxClassification {
  try {
    const parsed = JSON.parse(raw) as AiInboxClassification;
    return {
      project: parsed.project?.trim() || null,
      todos: (parsed.todos ?? []).map((t) => t.trim()).filter(Boolean),
      schedules: (parsed.schedules ?? [])
        .map((s) => ({
          title: s.title?.trim() ?? "",
          start_date: s.start_date?.trim() || null,
        }))
        .filter((s) => s.title),
      notes: (parsed.notes ?? []).map((n) => n.trim()).filter(Boolean),
    };
  } catch {
    console.error("[ai-classify] JSON parse failed:", raw.slice(0, 200));
    throw new Error("AI 응답 파싱에 실패했습니다.");
  }
}

export async function classifyWithAI(
  text: string,
  userId?: string,
): Promise<AiInboxClassification> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("입력 내용이 비어 있습니다.");
  }

  if (userId) {
    await assertAiRateLimit(userId);
  }

  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemPrompt(),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  try {
    const result = await model.generateContent(trimmed);
    const content = result.response.text();
    if (!content) {
      throw new Error("AI 응답을 받지 못했습니다.");
    }
    return parseClassification(content);
  } catch (error) {
    throw new Error(formatGeminiError(error));
  }
}

export function inferProjectType(
  projectName: string,
): "travel" | "business" | "custom" {
  const lower = projectName.toLowerCase();
  if (/여행|휴가|관광|오사카|도쿄|동경|제주|부산|해외/.test(lower)) {
    return "travel";
  }
  if (/출장|미팅|업무|회의|프로젝트/.test(lower)) {
    return "business";
  }
  return "custom";
}
