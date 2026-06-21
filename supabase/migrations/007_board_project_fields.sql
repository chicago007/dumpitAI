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
