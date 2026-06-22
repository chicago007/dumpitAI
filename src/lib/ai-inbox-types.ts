/** Gemini Structured Output 분류 결과 */
export interface AiScheduleItem {
  title: string;
  start_date: string | null;
}

export interface AiInboxClassification {
  project: string | null;
  todos: string[];
  schedules: AiScheduleItem[];
  notes: string[];
}

export interface InboxLog {
  id: string;
  user_id: string;
  original_text: string;
  ai_result: AiInboxClassification | null;
  space: string;
  created_at: string;
}

export interface InboxProcessResult {
  logId: string;
  classification: AiInboxClassification;
  boardId: string | null;
  created: {
    todos: number;
    schedules: number;
    notes: number;
  };
}
