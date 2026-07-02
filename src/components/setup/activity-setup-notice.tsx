export function ActivitySetupNotice() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/40">
        <h2 className="text-base font-semibold text-amber-900 dark:text-amber-100">
          활동 기능 DB 설정이 필요합니다
        </h2>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          Supabase에 활동 관련 컬럼이 아직 없습니다. 아래 SQL을 SQL Editor에서
          실행해 주세요.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-amber-900 dark:text-amber-100">
          <li>Supabase 대시보드 → SQL Editor</li>
          <li>
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">
              013_activity_logs.sql
            </code>
            이 아직이면 먼저 실행
          </li>
          <li>
            이어서{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">
              014_activity_custom_types.sql
            </code>{" "}
            실행
          </li>
          <li>브라우저에서 이 페이지 새로고침</li>
        </ol>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-amber-100/80 p-3 text-xs text-amber-950 dark:bg-amber-900/40 dark:text-amber-50">
{`ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS activity_key TEXT;

UPDATE activity_logs
SET activity_key = activity_type
WHERE activity_key IS NULL;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS custom_activity_types JSONB DEFAULT '[]'::jsonb;`}
        </pre>
      </div>
    </div>
  );
}
