#!/usr/bin/env bash
# 모든 마이그레이션을 하나의 SQL 파일로 합칩니다.
# 새 Supabase 프로젝트 SQL Editor에서 한 번에 실행할 때 사용합니다.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/supabase/schema-agent-full.sql"
MIGRATIONS=(
  001_initial_schema.sql
  002_add_checklist.sql
  003_user_settings.sql
  004_spaces.sql
  005_user_settings_rls.sql
  006_boards.sql
  007_board_project_fields.sql
  008_inbox_logs.sql
)

{
  echo "-- dumpitAI — full schema"
  echo "-- Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "-- Run once in a NEW Supabase project SQL Editor"
  echo ""
  for file in "${MIGRATIONS[@]}"; do
    echo "-- ─────────────────────────────────────────"
    echo "-- $file"
    echo "-- ─────────────────────────────────────────"
    cat "$ROOT/supabase/migrations/$file"
    echo ""
    echo ""
  done
} > "$OUT"

echo "Wrote $OUT"
