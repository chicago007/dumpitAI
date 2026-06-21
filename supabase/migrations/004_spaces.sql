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
