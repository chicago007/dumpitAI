import { Card } from "@/components/ui/card";

interface BoardSummaryCardProps {
  todayCount: number;
  overallProgress: number;
}

export function BoardSummaryCard({
  todayCount,
  overallProgress,
}: BoardSummaryCardProps) {
  return (
    <Card className="border-border/60 px-3 py-2 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">
          오늘 해야 할 일 {todayCount}개
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs tabular-nums text-muted-foreground">
            {overallProgress}%
          </span>
          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
