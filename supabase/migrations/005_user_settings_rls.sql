-- RLS for user_settings (required for upsert from app)

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own user_settings" ON user_settings;
CREATE POLICY "Users manage own user_settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
