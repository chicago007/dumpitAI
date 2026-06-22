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
