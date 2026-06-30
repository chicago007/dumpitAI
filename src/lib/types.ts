import type { Space, ViewSpace } from "@/lib/spaces";

export type EntryType = "memo" | "todo" | "schedule" | "checklist";
export type EntryStatus = "active" | "done" | "archived";
export type Priority = "low" | "medium" | "high";
export type { Space, ViewSpace };

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  keywords: string[];
  sort_order: number;
  is_default: boolean;
  is_deleted: boolean;
  space: Space;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  type: EntryType;
  category_id: string | null;
  board_id: string | null;
  status: EntryStatus;
  due_at: string | null;
  end_at: string | null;
  completed_at: string | null;
  priority: Priority;
  metadata: Record<string, unknown>;
  is_deleted: boolean;
  space: Space;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
}

export interface Board {
  id: string;
  user_id: string;
  name: string;
  color: string;
  space: Space;
  sort_order: number;
  is_deleted: boolean;
  project_type: string;
  start_date: string | null;
  end_date: string | null;
  budget_total: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClassificationResult {
  type: EntryType;
  categoryId: string | null;
  categoryName: string;
  dueAt: Date | null;
  confidence: number;
}

export interface CreateEntryInput {
  content: string;
  type: EntryType;
  categoryId: string;
  dueAt?: string | null;
  learnKeyword?: boolean;
  destination?: string | null;
  amount?: number | null;
  metadata?: Record<string, unknown>;
  space?: Space;
  boardId?: string | null;
}

export interface UpdateEntryInput {
  id: string;
  content: string;
  type: EntryType;
  categoryId: string;
  dueAt?: string | null;
  destination?: string | null;
  amount?: number | null;
}
