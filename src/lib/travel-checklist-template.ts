export interface TravelChecklistItem {
  id: string;
  label: string;
  /** 기본 제외 항목 (렌터카 X 등) */
  excluded?: boolean;
}

export interface TravelChecklistGroup {
  name: string;
  rows: TravelChecklistItem[][];
}

export const TRAVEL_CHECKLIST_COLUMNS = 6;

export const DEFAULT_TRAVEL_CHECKLIST_TEMPLATE: TravelChecklistGroup[] = [
  {
    name: "기본",
    rows: [
      [
        { id: "basic-flight", label: "비행기표" },
        { id: "basic-hotel", label: "호텔" },
        { id: "basic-visa", label: "비자" },
        { id: "basic-exchange", label: "환전" },
        { id: "basic-insurance", label: "여행자보험" },
        { id: "basic-roaming", label: "로밍(유심)" },
      ],
      [
        { id: "basic-parking", label: "공항주차장" },
        { id: "basic-ticket-print", label: "티켓출력" },
        { id: "basic-health-pass", label: "헬스패스" },
      ],
    ],
  },
  {
    name: "여행",
    rows: [
      [
        { id: "travel-airport", label: "공항이동(택시예약)" },
        { id: "travel-rental-car", label: "렌터카", excluded: true },
        { id: "travel-intl-license", label: "국제면허증", excluded: true },
        { id: "travel-dom-license", label: "국내면허증", excluded: true },
        { id: "travel-local-tour", label: "현지투어" },
        { id: "travel-food", label: "맛집" },
      ],
      [
        { id: "travel-show", label: "공연" },
        { id: "travel-map", label: "지도" },
        { id: "travel-guide", label: "여행정보(책)" },
        { id: "travel-local-app", label: "현지앱" },
      ],
    ],
  },
  {
    name: "위생용품",
    rows: [
      [
        { id: "hygiene-cosmetics", label: "화장품" },
        { id: "hygiene-toiletries", label: "세면도구" },
        { id: "hygiene-spray", label: "스프레이/젤/빗" },
        { id: "hygiene-razor", label: "면도기" },
        { id: "hygiene-sunscreen", label: "썬크림" },
        { id: "hygiene-floss", label: "치실" },
      ],
    ],
  },
  {
    name: "개인용품",
    rows: [
      [
        { id: "personal-powerbank", label: "보조배터리" },
        { id: "personal-charger", label: "충전기" },
        { id: "personal-adapter", label: "멀티어댑터" },
        { id: "personal-earphones", label: "유선이어폰" },
        { id: "personal-lens", label: "렌즈" },
        { id: "personal-sunglasses", label: "선글라스" },
      ],
      [
        { id: "personal-tablet", label: "미니패드" },
        { id: "personal-pen", label: "필기도구" },
        { id: "personal-bag", label: "여분가방" },
        { id: "personal-umbrella", label: "우산" },
        { id: "personal-wipes", label: "물티슈" },
        { id: "personal-massager", label: "안마기" },
      ],
      [
        { id: "personal-knife", label: "다용도칼" },
        { id: "personal-wallet", label: "지갑" },
        { id: "personal-mask", label: "마스크" },
        { id: "personal-shorts", label: "(반)바지" },
        { id: "personal-tshirt", label: "티셔츠" },
        { id: "personal-underwear", label: "팬티" },
      ],
      [
        { id: "personal-socks", label: "양말" },
        { id: "personal-shoes", label: "운동화" },
        { id: "personal-exercise-clothes", label: "운동복(양말)" },
        { id: "personal-slippers", label: "슬리퍼" },
        { id: "personal-swimcap", label: "수영모자" },
        { id: "personal-hat", label: "모자" },
      ],
      [
        { id: "personal-swimsuit", label: "수영복" },
        { id: "personal-rashguard", label: "래쉬가드" },
      ],
    ],
  },
  {
    name: "상비약",
    rows: [
      [
        { id: "medicine-bp", label: "혈압약" },
        { id: "medicine-cholesterol", label: "고지혈약" },
        { id: "medicine-allergy", label: "알러지약" },
        { id: "medicine-melatonin", label: "멜라토닌" },
        { id: "medicine-supplement", label: "영양제" },
      ],
    ],
  },
  {
    name: "음식",
    rows: [
      [
        { id: "food-water", label: "물" },
        { id: "food-cup-ramen", label: "컵라면" },
        { id: "food-kimchi", label: "볶음김치" },
        { id: "food-gochujang", label: "고추장" },
        { id: "food-rice", label: "햇반" },
        { id: "food-snack", label: "김병장" },
      ],
      [{ id: "food-medicine", label: "물약" }],
    ],
  },
];

export const TRAVEL_CHECKLIST_TEMPLATE = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE;

export function toBoardChecklistGroups(
  template: TravelChecklistGroup[] = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
): { name: string; items: string[] }[] {
  return template.map((group) => ({
    name: group.name,
    items: group.rows.flatMap((row) => row.map((item) => item.label)),
  }));
}

export function getTravelChecklistId(metadata: Record<string, unknown>) {
  const id = metadata.travelChecklistId;
  return typeof id === "string" ? id : null;
}

export function cloneTemplate(
  template: TravelChecklistGroup[] = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
): TravelChecklistGroup[] {
  return JSON.parse(JSON.stringify(template)) as TravelChecklistGroup[];
}

export function countTemplateItems(
  template: TravelChecklistGroup[] = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
) {
  let total = 0;
  let excluded = 0;
  for (const group of template) {
    for (const row of group.rows) {
      for (const item of row) {
        total += 1;
        if (item.excluded) excluded += 1;
      }
    }
  }
  return { total, excluded, actionable: total - excluded };
}

export function isTemplateEntry(
  entry: {
    content: string;
    metadata: Record<string, unknown>;
  },
  template: TravelChecklistGroup[] = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
) {
  const id = getTravelChecklistId(entry.metadata);
  if (id) return true;
  return findTemplateItemByLabel(entry.content, template) !== null;
}

export function findItemById(
  id: string,
  template: TravelChecklistGroup[] = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
) {
  for (const group of template) {
    for (const row of group.rows) {
      for (const item of row) {
        if (item.id === id) return { item, groupName: group.name };
      }
    }
  }
  return null;
}

export function findTemplateItemByLabel(
  content: string,
  template: TravelChecklistGroup[] = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
) {
  const trimmed = content.trim();
  if (!trimmed) return null;

  for (const group of template) {
    for (const row of group.rows) {
      for (const item of row) {
        if (trimmed === item.label) {
          return { item, groupName: group.name };
        }
      }
    }
  }

  let best: {
    item: TravelChecklistItem;
    groupName: string;
    score: number;
  } | null = null;

  for (const group of template) {
    for (const row of group.rows) {
      for (const item of row) {
        let score = 0;
        if (trimmed.includes(item.label)) {
          score = item.label.length;
        } else if (item.label.includes(trimmed) && trimmed.length >= 2) {
          score = trimmed.length;
        }
        if (score > 0 && (!best || score > best.score)) {
          best = { item, groupName: group.name, score };
        }
      }
    }
  }

  return best ? { item: best.item, groupName: best.groupName } : null;
}

export function matchesTravelChecklistLabel(
  content: string,
  template: TravelChecklistGroup[] = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
) {
  return findTemplateItemByLabel(content, template) !== null;
}

export function getAllTemplateItems(
  template: TravelChecklistGroup[] = DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
) {
  const items: { item: TravelChecklistItem; groupName: string }[] = [];
  for (const group of template) {
    for (const row of group.rows) {
      for (const item of row) {
        items.push({ item, groupName: group.name });
      }
    }
  }
  return items;
}
