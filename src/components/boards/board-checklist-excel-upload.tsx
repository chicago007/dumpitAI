"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload } from "lucide-react";
import { importChecklistRows } from "@/actions/boards";
import { parseChecklistSheetRows } from "@/lib/checklist-excel";
import { Button } from "@/components/ui/button";

interface BoardChecklistExcelUploadProps {
  boardId: string;
  defaultCategoryId: string;
}

export function BoardChecklistExcelUpload({
  boardId,
  defaultCategoryId,
}: BoardChecklistExcelUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setSuccess(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
      setError(".xlsx, .xls, .csv 파일만 업로드할 수 있습니다.");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setError("시트가 비어 있습니다.");
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
      });

      const parsed = parseChecklistSheetRows(rawRows);
      if (parsed.length === 0) {
        setError("가져올 항목을 찾지 못했습니다. 열 형식을 확인해 주세요.");
        return;
      }

      startTransition(async () => {
        try {
          const count = await importChecklistRows(
            boardId,
            parsed,
            defaultCategoryId,
          );
          setSuccess(`${count}개 항목을 가져왔습니다.`);
          router.refresh();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "가져오기에 실패했습니다.",
          );
        }
      });
    } catch {
      setError("파일을 읽지 못했습니다. 형식을 확인해 주세요.");
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileSpreadsheet
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">엑셀 가져오기</p>
            <p className="text-[11px] text-muted-foreground truncate">
              카테고리 · 항목 · 예산(선택)
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1 text-xs"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {isPending ? "가져오는 중…" : "파일 선택"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive select-text">{error}</p>
      )}
      {success && (
        <p className="mt-2 text-xs text-primary select-text">{success}</p>
      )}
    </div>
  );
}
