-- Frequently used entry filters (sidebar counts, type listings)

CREATE INDEX IF NOT EXISTS idx_entries_user_type_status
  ON entries(user_id, type, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_entries_board_null
  ON entries(user_id, created_at DESC)
  WHERE is_deleted = false AND board_id IS NULL;
