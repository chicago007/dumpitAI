-- 활동 종류 키 + 사용자 정의 활동 목록
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS activity_key TEXT;

UPDATE activity_logs
SET activity_key = activity_type
WHERE activity_key IS NULL;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS custom_activity_types JSONB DEFAULT '[]'::jsonb;
