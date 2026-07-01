-- 업무 공간 프로젝트 체크리스트 템플릿 (개인 여행 템플릿과 동일 패턴)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS work_checklist_template JSONB;
