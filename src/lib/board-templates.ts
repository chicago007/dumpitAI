import type { BoardProjectType } from "@/lib/board-types";
import { toBoardChecklistGroups } from "@/lib/travel-checklist-template";

export interface BoardTemplateGroup {
  name: string;
  items: string[];
}

export interface BoardTemplateBudget {
  name: string;
  ratio: number;
}

export interface BoardProjectTemplate {
  checklistGroups: BoardTemplateGroup[];
  budgetCategories: BoardTemplateBudget[];
  scheduleHints?: string[];
  memoHints?: string[];
  aiSuggestions?: string[];
}

const TRAVEL_CHECKLIST = toBoardChecklistGroups();

const TRAVEL_BUDGET: BoardTemplateBudget[] = [
  { name: "항공", ratio: 0.27 },
  { name: "숙박", ratio: 0.33 },
  { name: "식비", ratio: 0.17 },
  { name: "쇼핑", ratio: 0.17 },
  { name: "기타", ratio: 0.07 },
];

const STUDY_GROUPS: BoardTemplateGroup[] = [
  {
    name: "체크리스트",
    items: ["교재 구매", "학습 환경 정리", "목표 점수 확인"],
  },
  {
    name: "학습계획",
    items: ["주간 학습량 설정", "복습 루틴", "오답 노트"],
  },
  {
    name: "시험일정",
    items: ["모의고사 일정", "실전 시험일", "성적 확인"],
  },
  {
    name: "진도관리",
    items: ["1주차", "2주차", "3주차", "4주차"],
  },
];

const WORK_GROUPS: BoardTemplateGroup[] = [
  {
    name: "기능정의",
    items: ["요구사항 정리", "유스케이스", "API 스펙"],
  },
  {
    name: "UI 설계",
    items: ["와이어프레임", "화면 목록", "디자인 시스템"],
  },
  {
    name: "DB 설계",
    items: ["ERD", "마이그레이션", "시드 데이터"],
  },
  {
    name: "배포",
    items: ["CI/CD", "환경 변수", "모니터링"],
  },
  {
    name: "테스트",
    items: ["단위 테스트", "E2E", "QA 체크리스트"],
  },
];

const BUSINESS_GROUPS: BoardTemplateGroup[] = [
  {
    name: "출장 준비",
    items: ["항공/교통", "숙박", "일정표", "명함/자료"],
  },
  {
    name: "현장",
    items: ["미팅 준비", "보고 자료", "경비 정리"],
  },
];

const CAMPING_GROUPS: BoardTemplateGroup[] = [
  {
    name: "캠핑 장비",
    items: ["텐트", "침낭", "랜턴", "버너"],
  },
  {
    name: "식사",
    items: ["식재료", "물", "쿠커", "세척 도구"],
  },
];

export function getProjectTemplate(type: BoardProjectType): BoardProjectTemplate {
  switch (type) {
    case "travel":
      return {
        checklistGroups: TRAVEL_CHECKLIST,
        budgetCategories: TRAVEL_BUDGET,
        aiSuggestions: ["우산", "휴대용 선풍기", "모기약", "eSIM"],
      };
    case "business":
      return {
        checklistGroups: BUSINESS_GROUPS,
        budgetCategories: [
          { name: "교통", ratio: 0.3 },
          { name: "숙박", ratio: 0.4 },
          { name: "식비", ratio: 0.2 },
          { name: "기타", ratio: 0.1 },
        ],
      };
    case "camping":
      return {
        checklistGroups: CAMPING_GROUPS,
        budgetCategories: [
          { name: "장비", ratio: 0.4 },
          { name: "식비", ratio: 0.35 },
          { name: "기타", ratio: 0.25 },
        ],
      };
    case "study":
      return {
        checklistGroups: STUDY_GROUPS,
        budgetCategories: [
          { name: "교재", ratio: 0.4 },
          { name: "강의", ratio: 0.5 },
          { name: "기타", ratio: 0.1 },
        ],
      };
    case "work":
      return {
        checklistGroups: WORK_GROUPS,
        budgetCategories: [
          { name: "인프라", ratio: 0.3 },
          { name: "도구", ratio: 0.2 },
          { name: "마케팅", ratio: 0.3 },
          { name: "기타", ratio: 0.2 },
        ],
      };
    default:
      return {
        checklistGroups: [{ name: "체크리스트", items: [] }],
        budgetCategories: [{ name: "기타", ratio: 1 }],
      };
  }
}

export function getTravelAiSuggestions(
  destination?: string,
  season?: string,
): string[] {
  const base = ["우산", "휴대용 선풍기", "모기약", "eSIM"];
  if (season === "summer" || season === "여름") {
    return [...base, "선크림", "얇은 외투"];
  }
  if (destination?.includes("오사카") || destination?.includes("일본")) {
    return [...base, "간사이 패스 검토", "포켓 WiFi"];
  }
  return base;
}

export function formatBoardDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (!start && !end) return null;
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${y}.${m}.${day}`;
  };
  if (start && end) return `${fmt(start)} ~ ${fmt(end)}`;
  if (start) return fmt(start);
  return fmt(end!);
}

export function parseBudgetAmount(text: string): number {
  const digits = text.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function sumBoardExpenses(
  expenses: { amount: number }[] | undefined,
): number {
  return (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);
}
