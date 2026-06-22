import type { InboxLog } from "@/lib/ai-inbox-types";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, FolderKanban, StickyNote } from "lucide-react";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LogSummary({ log }: { log: InboxLog }) {
  const result = log.ai_result;
  if (!result) return null;

  const chips: { icon: React.ReactNode; label: string }[] = [];
  if (result.project) {
    chips.push({
      icon: <FolderKanban className="h-3 w-3" />,
      label: result.project,
    });
  }
  if (result.todos.length > 0) {
    chips.push({
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: `할일 ${result.todos.length}`,
    });
  }
  if (result.schedules.length > 0) {
    chips.push({
      icon: <Calendar className="h-3 w-3" />,
      label: `일정 ${result.schedules.length}`,
    });
  }
  if (result.notes.length > 0) {
    chips.push({
      icon: <StickyNote className="h-3 w-3" />,
      label: `메모 ${result.notes.length}`,
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          {chip.icon}
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function InboxLogList({ logs }: { logs: InboxLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 분석 기록이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm line-clamp-2">{log.original_text}</p>
              <time className="shrink-0 text-xs text-muted-foreground">
                {formatDate(log.created_at)}
              </time>
            </div>
            <LogSummary log={log} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
