-- AI Inbox: raw input + AI classification result log

CREATE TABLE IF NOT EXISTS inbox_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  ai_result JSONB,
  space TEXT NOT NULL DEFAULT 'personal'
    CHECK (space IN ('work', 'personal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_logs_user_space
  ON inbox_logs(user_id, space, created_at DESC);

ALTER TABLE inbox_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own inbox logs" ON inbox_logs;
CREATE POLICY "Users manage own inbox logs"
  ON inbox_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
