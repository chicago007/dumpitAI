import { revalidatePath } from "next/cache";

/** 항목·보드·인박스 변경 시 갱신할 앱 경로 */
const APP_DATA_PATHS = [
  "/",
  "/today",
  "/calendar",
  "/categories",
  "/memo",
  "/todo",
  "/schedule",
  "/boards",
  "/done",
  "/inbox",
] as const;

export function revalidateAppData(boardId?: string | null) {
  for (const path of APP_DATA_PATHS) {
    revalidatePath(path);
  }
  if (boardId) revalidatePath(`/boards/${boardId}`);
}

/** entries 액션과 동일 — 하위 호환 alias */
export function revalidateEntryPaths(boardId?: string | null) {
  revalidateAppData(boardId);
}

export function revalidateBoardPaths(boardId?: string | null) {
  revalidateAppData(boardId);
}

/** 공간·테마 등 레이아웃 전역 설정 */
export function revalidateAppLayout() {
  revalidatePath("/", "layout");
}

export function revalidateSettingsPaths() {
  revalidatePath("/settings");
  revalidatePath("/categories");
}
