"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import {
  addBoardTab,
  addCustomBoardTab,
  deleteBoardTab,
  updateBoardTabLabel,
} from "@/actions/boards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardTab, BoardTabConfig } from "@/lib/board-types";
import { availableTabKinds, tabKindLabel } from "@/lib/board-tabs";
import { PROJECT_LABEL } from "@/lib/project-labels";
import { cn } from "@/lib/utils";

interface BoardTabNavProps {
  boardId: string;
  tabs: BoardTabConfig[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
}

export function BoardTabNav({
  boardId,
  tabs,
  activeTabId,
  onSelect,
}: BoardTabNavProps) {
  const router = useRouter();
  const [isManaging, setIsManaging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newTabName, setNewTabName] = useState("");
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [isPending, startTransition] = useTransition();

  const addableKinds = availableTabKinds(tabs);

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTabId) && tabs[0]) {
      onSelect(tabs[0].id);
    }
  }, [tabs, activeTabId, onSelect]);

  function refresh() {
    router.refresh();
  }

  function startEdit(tab: BoardTabConfig) {
    setEditingId(tab.id);
    setEditLabel(tab.label);
  }

  function handleSaveEdit(tabId: string) {
    const trimmed = editLabel.trim();
    if (!trimmed) return;

    startTransition(async () => {
      await updateBoardTabLabel(boardId, tabId, trimmed);
      setEditingId(null);
      refresh();
    });
  }

  function handleDelete(tab: BoardTabConfig) {
    if (tabs.length <= 1) {
      alert("분류를 하나 이상 남겨 두세요.");
      return;
    }
    if (!confirm(`"${tab.label}" 분류를 삭제할까요?`)) return;

    startTransition(async () => {
      await deleteBoardTab(boardId, tab.id);
      if (tab.id === activeTabId) {
        const remaining = tabs.filter((t) => t.id !== tab.id);
        onSelect(remaining[0]?.id ?? "");
      }
      refresh();
    });
  }

  function handleAddCustom() {
    const trimmed = newTabName.trim();
    if (!trimmed) return;

    startTransition(async () => {
      try {
        await addCustomBoardTab(boardId, trimmed);
        setNewTabName("");
        refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "추가에 실패했습니다.");
      }
    });
  }

  function handleAddPreset(kind: BoardTab) {
    startTransition(async () => {
      await addBoardTab(boardId, kind);
      setIsAddingPreset(false);
      refresh();
    });
  }

  if (isManaging) {
    return (
      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {PROJECT_LABEL} 분류 관리
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setIsManaging(false);
              setEditingId(null);
              setIsAddingPreset(false);
            }}
            aria-label="분류 관리 닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ul className="space-y-1.5">
          {tabs.map((tab) => (
            <li
              key={tab.id}
              className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5"
            >
              {editingId === tab.id ? (
                <>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-8 flex-1 text-sm"
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(tab.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0"
                    disabled={isPending}
                    onClick={() => handleSaveEdit(tab.id)}
                  >
                    저장
                  </Button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tab.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {tab.checklistGroupId
                        ? "사용자 분류 · 체크리스트"
                        : tabKindLabel(tab.kind)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={isPending}
                    onClick={() => startEdit(tab)}
                    aria-label="이름 수정"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 hover:text-destructive"
                    disabled={isPending || tabs.length <= 1}
                    onClick={() => handleDelete(tab)}
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-border/50 pt-3">
          <p className="text-xs font-medium text-foreground">+ 분류 추가</p>
          <div className="flex gap-2">
            <Input
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="예: 항공, 숙박, 서류"
              className="h-8 flex-1 text-sm"
              disabled={isPending}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCustom();
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0"
              disabled={isPending || !newTabName.trim()}
              onClick={handleAddCustom}
            >
              추가
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            이름을 입력하면 체크리스트 분류 탭이 추가됩니다.
          </p>

          {addableKinds.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-muted-foreground">
                삭제한 기본 분류 다시 추가:
              </p>
              {isAddingPreset ? (
                <div className="flex flex-wrap gap-1.5">
                  {addableKinds.map((kind) => (
                    <Button
                      key={kind}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={isPending}
                      onClick={() => handleAddPreset(kind)}
                    >
                      + {tabKindLabel(kind)}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setIsAddingPreset(false)}
                  >
                    취소
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={isPending}
                  onClick={() => setIsAddingPreset(true)}
                >
                  기본 분류 선택
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <nav
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none"
        aria-label={`${PROJECT_LABEL} 탭`}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              activeTabId === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1 px-2.5 text-xs text-muted-foreground"
        onClick={() => setIsManaging(true)}
        aria-label="분류 관리"
      >
        <Settings2 className="h-3.5 w-3.5" />
        <span>분류</span>
      </Button>
    </div>
  );
}
