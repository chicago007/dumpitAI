-- AI daily usage tracking + atomic board delete

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  call_count INT NOT NULL DEFAULT 0 CHECK (call_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ai_usage_daily" ON ai_usage_daily;
CREATE POLICY "Users manage own ai_usage_daily"
  ON ai_usage_daily FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION delete_board_atomic(p_board_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  UPDATE entries
  SET board_id = NULL
  WHERE board_id = p_board_id
    AND user_id = auth.uid();

  UPDATE boards
  SET is_deleted = true
  WHERE id = p_board_id
    AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION delete_board_atomic(UUID) TO authenticated;
