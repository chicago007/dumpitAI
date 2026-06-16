-- Allow "checklist" entry type
-- Run this migration in Supabase SQL Editor (safe to run more than once).

ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_type_check;

ALTER TABLE public.entries
  ADD CONSTRAINT entries_type_check
  CHECK (type IN ('memo', 'todo', 'schedule', 'checklist'));
