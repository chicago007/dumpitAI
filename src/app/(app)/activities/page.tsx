import { ActivityLogSections } from "@/components/activities/activity-log-sections";
import { ActivityQuickInput } from "@/components/activities/activity-quick-input";
import { ActivityTypeManager } from "@/components/activities/activity-type-manager";
import { ActivityWeekSummary } from "@/components/activities/activity-week-summary";
import { PageShell, SectionCard } from "@/components/layout/page-shell";
import { ActivitySetupNotice } from "@/components/setup/activity-setup-notice";
import { SetupNotice } from "@/components/setup/setup-notice";
import {
  getActivityLogs,
  getActivityWeekStats,
} from "@/actions/activities";
import { getActivityCatalogForUser } from "@/actions/activity-settings";
import { getActiveSpace } from "@/actions/space";
import { VIEW_SPACE_LABELS } from "@/lib/spaces";
import { isActivitySchemaError, isSchemaSetupError } from "@/lib/supabase/errors";

export default async function ActivitiesPage() {
  const activeSpace = await getActiveSpace();

  let logs: Awaited<ReturnType<typeof getActivityLogs>> = [];
  let weekStats: Awaited<ReturnType<typeof getActivityWeekStats>> = [];
  let catalog: Awaited<ReturnType<typeof getActivityCatalogForUser>> = [];

  try {
    [logs, weekStats, catalog] = await Promise.all([
      getActivityLogs(activeSpace, 100),
      getActivityWeekStats(activeSpace),
      getActivityCatalogForUser(),
    ]);
  } catch (error) {
    if (isSchemaSetupError(error)) {
      return <SetupNotice />;
    }
    if (isActivitySchemaError(error)) {
      return <ActivitySetupNotice />;
    }
    throw error;
  }

  return (
    <PageShell
      title={`활동 · ${VIEW_SPACE_LABELS[activeSpace]}`}
      description="독서·운동 등 일정·할 일과 별도로 기록합니다"
    >
      <div className="space-y-4">
        <ActivityTypeManager catalog={catalog} />

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            이번 주
          </h2>
          <ActivityWeekSummary stats={weekStats} catalog={catalog} />
        </section>

        <SectionCard title="기록 추가">
          <ActivityQuickInput catalog={catalog} />
        </SectionCard>

        <ActivityLogSections logs={logs} catalog={catalog} />
      </div>
    </PageShell>
  );
}
