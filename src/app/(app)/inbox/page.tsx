import { getInboxLogs } from "@/actions/inbox";
import { InboxInput } from "@/components/inbox/inbox-input";
import { InboxLogList } from "@/components/inbox/inbox-log-list";
import { PageShell, SectionCard } from "@/components/layout/page-shell";
import { SetupNotice } from "@/components/setup/setup-notice";
import { isSchemaSetupError } from "@/lib/supabase/errors";

export default async function InboxPage() {
  let logs: Awaited<ReturnType<typeof getInboxLogs>> = [];
  let schemaError = false;

  try {
    logs = await getInboxLogs();
  } catch (e) {
    if (isSchemaSetupError(e)) {
      schemaError = true;
    } else {
      throw e;
    }
  }

  if (schemaError) {
    return <SetupNotice />;
  }

  return (
    <PageShell
      compact
      className="max-w-2xl"
      title="AI Inbox"
      description="생각을 입력하면 AI가 프로젝트·할일·일정·메모로 자동 분류합니다"
    >
      <InboxInput />

      <SectionCard plain title={`최근 분석 (${logs.length})`}>
        <InboxLogList logs={logs} />
      </SectionCard>
    </PageShell>
  );
}
