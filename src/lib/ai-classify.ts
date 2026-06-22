import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import type { AiInboxClassification } from "./ai-inbox-types";

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

const SYSTEM_PROMPT = `당신은 한국어 생각 입력을 분류하는 비서입니다.
사용자 입력을 분석해 프로젝트, 할일, 일정, 메모로 나눕니다.

규칙:
- 날짜·시간이 있으면 schedules에 넣습니다. (예: "내일 오후 2시 치과")
- 해야 할 행동이면 todos에 넣습니다. (예: "보험금 청구해야 함")
- 여러 항목이 하나의 주제(출장, 여행 등)로 묶이면 project에 이름을 넣습니다.
- 참고·아이디어·감상은 notes에 넣습니다.
- 한 입력에서 여러 유형이 동시에 나올 수 있습니다.
- 오늘 날짜: ${new Date().toISOString().slice(0, 10)}
- 상대 날짜(내일, 다음주 등)는 ISO 8601로 변환합니다.
- 빈 배열은 []로, 프로젝트가 없으면 project는 null입니다.`;

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
}

export async function classifyWithAI(
  text: string,
): Promise<AiInboxClassification> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("입력 내용이 비어 있습니다.");
  }

  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const result = await model.generateContent(trimmed);
  const content = result.response.text();
  if (!content) {
    throw new Error("AI 응답을 받지 못했습니다.");
  }

  return parseClassification(content);
}

export function inferProjectType(
  projectName: string,
): "travel" | "business" | "custom" {
  const lower = projectName.toLowerCase();
  if (/여행|휴가|관광|오사카|도쿄|제주|부산|해외/.test(lower)) {
    return "travel";
  }
  if (/출장|미팅|업무|회의|프로젝트/.test(lower)) {
    return "business";
  }
  return "custom";
}
