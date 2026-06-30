export const APPEARANCE_THEME_COOKIE = "dumpit_appearance_theme";

export const APPEARANCE_THEME_IDS = [
  "default",
  "white",
  "warm",
  "solarized-dark",
  "midnight",
] as const;

export type AppearanceThemeId = (typeof APPEARANCE_THEME_IDS)[number];

export interface AppearanceThemeOption {
  id: AppearanceThemeId;
  label: string;
  description: string;
  /** 미리보기 스와치 (배경색) */
  swatch: string;
}

export const APPEARANCE_THEMES: AppearanceThemeOption[] = [
  {
    id: "default",
    label: "기본",
    description: "밝은 회색 배경",
    swatch: "#f5f5f7",
  },
  {
    id: "white",
    label: "흰색",
    description: "깔끔한 흰 배경",
    swatch: "#ffffff",
  },
  {
    id: "warm",
    label: "따뜻한",
    description: "아이보리 톤",
    swatch: "#faf8f5",
  },
  {
    id: "solarized-dark",
    label: "Solarized Dark",
    description: "Solarized 다크 팔레트",
    swatch: "#002b36",
  },
  {
    id: "midnight",
    label: "미드나잇",
    description: "진한 슬레이트",
    swatch: "#0f172a",
  },
];

export function isAppearanceThemeId(value: unknown): value is AppearanceThemeId {
  return (
    typeof value === "string" &&
    APPEARANCE_THEME_IDS.includes(value as AppearanceThemeId)
  );
}

export function getAppearanceThemeMeta(id: AppearanceThemeId) {
  return APPEARANCE_THEMES.find((t) => t.id === id) ?? APPEARANCE_THEMES[0];
}
