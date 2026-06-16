-- Dumpit initial schema

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

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION seed_default_categories();

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own entries"
  ON entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
