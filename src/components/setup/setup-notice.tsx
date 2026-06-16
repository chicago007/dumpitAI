export function SetupNotice() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-base font-semibold text-amber-900">
          데이터베이스 설정이 필요합니다
        </h2>
        <p className="mt-2 text-sm text-amber-800">
          Supabase에 테이블이 아직 없습니다. 아래 SQL을 한 번 실행해 주세요.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-amber-900">
          <li>Supabase 대시보드 → SQL Editor</li>
          <li>
            프로젝트의{" "}
            <code className="rounded bg-amber-100 px-1">
              supabase/migrations/001_initial_schema.sql
            </code>{" "}
            내용 붙여넣기
          </li>
          <li>Run 실행 후 이 페이지 새로고침</li>
        </ol>
        <p className="mt-4 text-xs text-amber-700">
          이미 가입한 계정은 SQL 실행 후 카테고리가 자동으로 생성됩니다.
        </p>
      </div>
    </div>
  );
}
