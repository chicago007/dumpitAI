import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import type { Space } from "@/lib/spaces";
import { inferSpaceFromContent } from "@/lib/spaces";
import { formatGeminiError } from "@/lib/ai-classify-fallback";

const SPACE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    space: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["work", "personal"],
      description: "work=업무, personal=개인",
    },
  },
  required: ["space"],
};

const PERSONAL_HINT =
  /여행|휴가|가족|쇼핑|운동|건강|병원|맛집|카페|영화|취미|동경|도쿄|제주|해외/;

export function inferSpaceFromRules(text: string): Space | null {
  const fromKeywords = inferSpaceFromContent(text);
  if (fromKeywords) return fromKeywords;
  if (PERSONAL_HINT.test(text)) return "personal";
  return null;
}

async function inferSpaceWithAI(text: string): Promise<Space | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SPACE_SCHEMA,
        temperature: 0.1,
      },
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `다음 입력이 "업무(work)"인지 "개인(personal)"인지 판단하세요.
회의·보고서·출장·프로젝트·업무는 work, 여행·가족·취미·생활은 personal입니다.

입력: ${text}`,
            },
          ],
        },
      ],
    });

    const raw = result.response.text();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { space?: string };
    if (parsed.space === "work" || parsed.space === "personal") {
      return parsed.space;
    }
    return null;
  } catch (error) {
    console.warn("inferSpaceWithAI:", formatGeminiError(error));
    return null;
  }
}

export type SpaceInferSource = "rules" | "ai" | "default";

export async function inferSpaceForAllView(
  text: string,
): Promise<{ space: Space; source: SpaceInferSource }> {
  const fromRules = inferSpaceFromRules(text);
  if (fromRules) return { space: fromRules, source: "rules" };

  const fromAi = await inferSpaceWithAI(text);
  if (fromAi) return { space: fromAi, source: "ai" };

  return { space: "personal", source: "default" };
}
