import type { Space } from "@/lib/spaces";

export type BuiltinActivityType = "reading" | "exercise";
export type ActivityType = BuiltinActivityType | "custom";

export interface ActivityLog {
  id: string;
  user_id: string;
  space: Space;
  activity_type: ActivityType;
  activity_key: string | null;
  content: string;
  logged_at: string;
  duration_min: number | null;
  quantity: number | null;
  unit: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityLogInput {
  activityKey: string;
  content?: string;
  loggedAt?: string;
  durationMin?: number | null;
  quantity?: number | null;
  unit?: string | null;
  space?: Space;
}

export function resolveActivityKey(log: ActivityLog) {
  return log.activity_key ?? log.activity_type;
}
