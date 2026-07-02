-- 활동 기록 (독서·운동 등) — entries(일정·할일)와 분리
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space TEXT NOT NULL CHECK (space IN ('work', 'personal')),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('reading', 'exercise', 'custom')),
  content TEXT NOT NULL DEFAULT '',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_min INT,
  quantity NUMERIC,
  unit TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_logged
  ON activity_logs(user_id, logged_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_space
  ON activity_logs(user_id, space)
  WHERE is_deleted = false;

DROP TRIGGER IF EXISTS activity_logs_updated_at ON activity_logs;
CREATE TRIGGER activity_logs_updated_at
  BEFORE UPDATE ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own activity_logs" ON activity_logs;
CREATE POLICY "Users manage own activity_logs"
  ON activity_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
