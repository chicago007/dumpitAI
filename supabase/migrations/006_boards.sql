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
