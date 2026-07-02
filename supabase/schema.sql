-- supabase/migrations/001_initial_schema.sql
-- Dumpit initial schema (safe to re-run)

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📌',
  color TEXT NOT NULL DEFAULT '#9CA3AF',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- entries
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('memo', 'todo', 'schedule', 'checklist')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'done', 'archived')),
  due_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  metadata JSONB NOT NULL DEFAULT '{}',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)
  WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id)
  WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_entries_due ON entries(user_id, due_at)
  WHERE is_deleted = false AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category_id)
  WHERE is_deleted = false;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS entries_updated_at ON entries;
CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- seed default categories on signup
CREATE OR REPLACE FUNCTION seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (user_id, name, icon, color, keywords, is_default, sort_order)
  VALUES
    (NEW.id, '업무', '💼', '#3B82F6',
      ARRAY['회의','보고서','제출','프로젝트','이메일','미팅','업무'], true, 1),
    (NEW.id, '여행', '✈️', '#0EA5E9',
      ARRAY['항공','호텔','여권','제주','해외','여행','비행기'], true, 2),
    (NEW.id, '독서', '📚', '#92400E',
      ARRAY['책','읽기','독서','페이지','도서'], true, 3),
    (NEW.id, '운동', '🏋️', '#EF4444',
      ARRAY['헬스','러닝','요가','PT','근력','운동','헬스장'], true, 4),
    (NEW.id, '다이어트', '🥗', '#22C55E',
      ARRAY['칼로리','체중','식단','탄수화물','다이어트'], true, 5),
    (NEW.id, '생활', '🏠', '#6B7280',
      ARRAY['장보기','청소','세탁','공과금','생활'], true, 6),
    (NEW.id, '건강', '💊', '#EC4899',
      ARRAY['병원','약','검진','수면','건강'], true, 7),
    (NEW.id, '재정', '💰', '#EAB308',
      ARRAY['저축','카드','예산','투자','재정','돈'], true, 8),
    (NEW.id, '학습', '🎓', '#8B5CF6',
      ARRAY['공부','강의','시험','자격증','학습'], true, 9),
    (NEW.id, '기타', '📌', '#9CA3AF', ARRAY[]::TEXT[], true, 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_default_categories();

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own categories" ON categories;
CREATE POLICY "Users manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own entries" ON entries;
CREATE POLICY "Users manage own entries"
  ON entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- supabase/migrations/002_add_checklist.sql
-- Allow "checklist" entry type
-- Run this migration in Supabase SQL Editor (safe to run more than once).

ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_type_check;

ALTER TABLE public.entries
  ADD CONSTRAINT entries_type_check
  CHECK (type IN ('memo', 'todo', 'schedule', 'checklist'));

-- supabase/migrations/003_user_settings.sql
-- User settings (travel checklist template customization)
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  travel_checklist_template JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS user_settings_updated_at ON user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own user_settings" ON user_settings;
CREATE POLICY "Users manage own user_settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- supabase/migrations/004_spaces.sql
-- Work / personal spaces

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS space TEXT NOT NULL DEFAULT 'personal'
    CHECK (space IN ('work', 'personal'));

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS space TEXT NOT NULL DEFAULT 'personal'
    CHECK (space IN ('work', 'personal'));

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS active_space TEXT NOT NULL DEFAULT 'personal'
    CHECK (active_space IN ('work', 'personal'));

UPDATE categories
SET space = 'work'
WHERE name IN ('업무', '학습');

UPDATE categories
SET space = 'personal'
WHERE name NOT IN ('업무', '학습');

UPDATE entries e
SET space = c.space
FROM categories c
WHERE e.category_id = c.id;

UPDATE entries
SET space = 'personal'
WHERE space IS NULL OR space NOT IN ('work', 'personal');

CREATE INDEX IF NOT EXISTS idx_categories_user_space ON categories(user_id, space)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_entries_user_space ON entries(user_id, space)
  WHERE is_deleted = false;

-- supabase/migrations/005_user_settings_rls.sql
-- RLS for user_settings (required for upsert from app)

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own user_settings" ON user_settings;
CREATE POLICY "Users manage own user_settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- supabase/migrations/006_boards.sql
-- Boards: grouped todos with progress (UI label: 보드)

CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10b981',
  space TEXT NOT NULL DEFAULT 'personal'
    CHECK (space IN ('work', 'personal')),
  sort_order INT NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boards_user_space ON boards(user_id, space)
  WHERE is_deleted = false;

DROP TRIGGER IF EXISTS boards_updated_at ON boards;
CREATE TRIGGER boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entries_board ON entries(board_id)
  WHERE is_deleted = false;

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own boards" ON boards;
CREATE POLICY "Users manage own boards"
  ON boards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- supabase/migrations/007_board_project_fields.sql
-- Board project fields: dates, type, budget, metadata

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (project_type IN ('travel', 'business', 'camping', 'study', 'work', 'custom'));

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS budget_total BIGINT NOT NULL DEFAULT 0;

ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- supabase/migrations/008_inbox_logs.sql
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

-- 가입 시 기본 카테고리 시드 (space + search_path 수정)
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (
    user_id, name, icon, color, keywords, is_default, sort_order, space
  )
  VALUES
    (NEW.id, '업무', '💼', '#3B82F6',
      ARRAY['회의','보고서','제출','프로젝트','이메일','미팅','업무'], true, 1, 'work'),
    (NEW.id, '여행', '✈️', '#0EA5E9',
      ARRAY['항공','호텔','여권','제주','해외','여행','비행기'], true, 2, 'personal'),
    (NEW.id, '독서', '📚', '#92400E',
      ARRAY['책','읽기','독서','페이지','도서'], true, 3, 'personal'),
    (NEW.id, '운동', '🏋️', '#EF4444',
      ARRAY['헬스','러닝','요가','PT','근력','운동','헬스장'], true, 4, 'personal'),
    (NEW.id, '다이어트', '🥗', '#22C55E',
      ARRAY['칼로리','체중','식단','탄수화물','다이어트'], true, 5, 'personal'),
    (NEW.id, '생활', '🏠', '#6B7280',
      ARRAY['장보기','청소','세탁','공과금','생활'], true, 6, 'personal'),
    (NEW.id, '건강', '💊', '#EC4899',
      ARRAY['병원','약','검진','수면','건강'], true, 7, 'personal'),
    (NEW.id, '재정', '💰', '#EAB308',
      ARRAY['저축','카드','예산','투자','재정','돈'], true, 8, 'personal'),
    (NEW.id, '학습', '🎓', '#8B5CF6',
      ARRAY['공부','강의','시험','자격증','학습'], true, 9, 'work'),
    (NEW.id, '기타', '📌', '#9CA3AF', ARRAY[]::TEXT[], true, 10, 'personal');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

GRANT EXECUTE ON FUNCTION public.seed_default_categories() TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_default_categories() TO supabase_auth_admin;

-- supabase/migrations/009_appearance_theme.sql
-- User appearance / background theme preference

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS appearance_theme TEXT NOT NULL DEFAULT 'default'
    CHECK (appearance_theme IN (
      'default',
      'white',
      'warm',
      'solarized-dark',
      'midnight'
    ));

-- supabase/migrations/010_query_indexes.sql
-- Frequently used entry filters (sidebar counts, type listings)

CREATE INDEX IF NOT EXISTS idx_entries_user_type_status
  ON entries(user_id, type, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_entries_board_null
  ON entries(user_id, created_at DESC)
  WHERE is_deleted = false AND board_id IS NULL;

-- supabase/migrations/011_ai_usage_and_board_rpc.sql
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

-- supabase/migrations/012_work_checklist_template.sql
-- 업무 공간 프로젝트 체크리스트 템플릿 (개인 여행 템플릿과 동일 패턴)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS work_checklist_template JSONB;

