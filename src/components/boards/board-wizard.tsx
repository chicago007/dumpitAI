"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createBoardWithWizard } from "@/actions/boards";
import {
  BOARD_PROJECT_TYPE_LABELS,
  type BoardProjectType,
} from "@/lib/board-types";
import { PROJECT_LABEL } from "@/lib/project-labels";
import { parseBudgetAmount } from "@/lib/board-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Category, Space } from "@/lib/types";
import { cn } from "@/lib/utils";

const BOARD_COLORS = [
  "#10b981",
  "#007aff",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#0ea5e9",
];

const PROJECT_TYPES: BoardProjectType[] = [
  "travel",
  "business",
  "camping",
  "study",
  "work",
  "custom",
];

interface BoardWizardProps {
  activeSpace: Space;
  categories: Category[];
}

export function BoardWizard({ activeSpace, categories }: BoardWizardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [projectType, setProjectType] = useState<BoardProjectType>("travel");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetText, setBudgetText] = useState("");
  const [season, setSeason] = useState("여름");
  const [customLabel, setCustomLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultCategory =
    categories.find((c) => c.name === "기타") ?? categories[0];

  function reset() {
    setStep(0);
    setName("");
    setDestination("");
    setStartDate("");
    setEndDate("");
    setBudgetText("");
    setError(null);
  }

  function handleCreate() {
    if (!defaultCategory) {
      setError("카테고리가 없습니다.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const id = await createBoardWithWizard({
          name,
          color,
          space: activeSpace,
          projectType,
          startDate: startDate || null,
          endDate: endDate || null,
          budgetTotal: parseBudgetAmount(budgetText),
          destination: projectType === "travel" ? destination : undefined,
          season: projectType === "travel" ? season : undefined,
          customTypeLabel:
            projectType === "custom" ? customLabel : undefined,
          defaultCategoryId: defaultCategory.id,
        });
        setOpen(false);
        reset();
        router.push(`/boards/${id}`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `${PROJECT_LABEL} 생성에 실패했습니다.`,
        );
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2.5 text-xs font-medium"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        새 {PROJECT_LABEL}
      </Button>

      <Sheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <SheetContent side="bottom" className="max-h-[90vh] p-4 pt-6">
          <h2 className="text-base font-semibold text-foreground">
            {step === 0
              ? `새 ${PROJECT_LABEL}`
              : step === 1
                ? `이 ${PROJECT_LABEL}는 무엇인가요?`
                : "세부 정보"}
          </h2>

          {step === 0 && (
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>{PROJECT_LABEL} 이름</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="오사카 여행"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>색상</Label>
                <div className="flex flex-wrap gap-2">
                  {BOARD_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="h-7 w-7 rounded-full border-2"
                      style={{
                        backgroundColor: c,
                        borderColor: color === c ? c : "transparent",
                      }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!name.trim()}
                onClick={() => setStep(1)}
              >
                다음
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setProjectType(type)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                      projectType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    {BOARD_PROJECT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
              {projectType === "custom" && (
                <Input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="유형 이름"
                />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  이전
                </Button>
                <Button className="flex-1" onClick={() => setStep(2)}>
                  다음
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-4 space-y-3">
              {projectType === "travel" && (
                <>
                  <div className="space-y-1.5">
                    <Label>여행지</Label>
                    <Input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="오사카"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>계절</Label>
                    <select
                      value={season}
                      onChange={(e) => setSeason(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input px-3 text-sm"
                    >
                      <option value="봄">봄</option>
                      <option value="여름">여름</option>
                      <option value="가을">가을</option>
                      <option value="겨울">겨울</option>
                    </select>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>시작일</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>종료일</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>총 예산 (원)</Label>
                <Input
                  value={budgetText}
                  onChange={(e) => setBudgetText(e.target.value)}
                  placeholder="3,000,000"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  이전
                </Button>
                <Button
                  className="flex-1"
                  disabled={isPending}
                  onClick={handleCreate}
                >
                  {isPending ? "생성 중…" : `${PROJECT_LABEL} 만들기`}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                체크리스트·예산 카테고리가 유형에 맞게 자동 생성됩니다.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
