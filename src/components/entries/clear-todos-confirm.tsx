"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clearStandaloneTodos } from "@/actions/entries";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

interface ClearTodosConfirmProps {
  count: number;
}

export function ClearTodosConfirm({ count }: ClearTodosConfirmProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await clearStandaloneTodos();
        router.push("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
      }
    });
  }

  return (
    <PageShell
      compact
      className="max-w-2xl"
      title="할 일 전체 삭제"
      description="삭제 전에 한 번 더 확인해 주세요"
    >
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        {count === 0 ? (
          <p className="text-sm text-muted-foreground">
            삭제할 일반 할 일이 없습니다. 프로젝트에 속한 할 일은 이 작업에서
            제외됩니다.
          </p>
        ) : (
          <p className="text-sm leading-relaxed">
            일반 할 일{" "}
            <span className="font-semibold text-foreground">{count}개</span>를
            삭제합니다.
            <br />
            프로젝트에 속한 할 일은 유지됩니다.
            <br />
            <span className="text-destructive">삭제한 항목은 복구할 수 없습니다.</span>
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/">취소</Link>
          </Button>
          {count > 0 && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "삭제 중…" : `${count}개 삭제`}
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
