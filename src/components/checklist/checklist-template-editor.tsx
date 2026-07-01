"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cloneTemplate,
  DEFAULT_TRAVEL_CHECKLIST_TEMPLATE,
  TRAVEL_CHECKLIST_COLUMNS,
  type TravelChecklistGroup,
  type TravelChecklistItem,
} from "@/lib/travel-checklist-template";
import {
  resetTravelChecklistTemplate,
  resetWorkChecklistTemplate,
  saveTravelChecklistTemplate,
  saveWorkChecklistTemplate,
} from "@/actions/travel-checklist-settings";
import { getProjectTemplate } from "@/lib/board-templates";
import type { Space } from "@/lib/spaces";

interface EditorGroup {
  name: string;
  items: TravelChecklistItem[];
}

function toEditorGroups(template: TravelChecklistGroup[]): EditorGroup[] {
  return template.map((group) => ({
    name: group.name,
    items: group.rows.flat(),
  }));
}

function toTemplate(groups: EditorGroup[]): TravelChecklistGroup[] {
  return groups.map((group) => {
    const items = group.items.filter((item) => item.label.trim());
    const rows: TravelChecklistItem[][] = [];
    for (let i = 0; i < items.length; i += TRAVEL_CHECKLIST_COLUMNS) {
      rows.push(items.slice(i, i + TRAVEL_CHECKLIST_COLUMNS));
    }
    return { name: group.name.trim() || "항목", rows: rows.length ? rows : [[]] };
  });
}

function newItemId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultWorkTemplate(): TravelChecklistGroup[] {
  const groups = getProjectTemplate("work").checklistGroups;
  return groups.map((group) => ({
    name: group.name,
    rows: [
      group.items.map((label, index) => ({
        id: `work-${group.name}-${index}`,
        label,
      })),
    ],
  }));
}

export function ChecklistTemplateEditor({
  initialTemplate,
  space = "personal",
}: {
  initialTemplate: TravelChecklistGroup[];
  space?: Space;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<EditorGroup[]>(
    toEditorGroups(cloneTemplate(initialTemplate)),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateGroupName(index: number, name: string) {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, name } : g)),
    );
  }

  function updateItemLabel(
    groupIndex: number,
    itemIndex: number,
    label: string,
  ) {
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex
          ? {
              ...g,
              items: g.items.map((item, ii) =>
                ii === itemIndex ? { ...item, label } : item,
              ),
            }
          : g,
      ),
    );
  }

  function toggleExcluded(groupIndex: number, itemIndex: number) {
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex
          ? {
              ...g,
              items: g.items.map((item, ii) =>
                ii === itemIndex
                  ? { ...item, excluded: !item.excluded }
                  : item,
              ),
            }
          : g,
      ),
    );
  }

  function removeItem(groupIndex: number, itemIndex: number) {
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex
          ? { ...g, items: g.items.filter((_, ii) => ii !== itemIndex) }
          : g,
      ),
    );
  }

  function addItem(groupIndex: number) {
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIndex
          ? {
              ...g,
              items: [...g.items, { id: newItemId(), label: "새 항목" }],
            }
          : g,
      ),
    );
  }

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { name: "새 구분", items: [{ id: newItemId(), label: "새 항목" }] },
    ]);
  }

  function removeGroup(index: number) {
    setGroups((prev) => prev.filter((_, i) => i !== index));
  }

  const isWork = space === "work";

  function handleSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const template = toTemplate(groups);
        if (isWork) {
          await saveWorkChecklistTemplate(template);
        } else {
          await saveTravelChecklistTemplate(template);
        }
        setMessage("체크리스트 항목을 저장했습니다.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  }

  function handleReset() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        if (isWork) {
          await resetWorkChecklistTemplate();
          setGroups(toEditorGroups(cloneTemplate(defaultWorkTemplate())));
        } else {
          await resetTravelChecklistTemplate();
          setGroups(
            toEditorGroups(cloneTemplate(DEFAULT_TRAVEL_CHECKLIST_TEMPLATE)),
          );
        }
        setMessage("기본 체크리스트로 되돌렸습니다.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "복원에 실패했습니다.");
      }
    });
  }

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-sky-700 hover:text-sky-900"
      >
        {open ? "▾ 항목 편집 닫기" : "▸ 프로젝트 체크리스트 항목·세부항목 편집"}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-4 text-xs text-slate-500">
            구분과 세부 항목을 수정할 수 있습니다.{" "}
            {isWork
              ? "업무 프로젝트 생성 시 이 목록이 체크리스트 기본값으로 사용됩니다."
              : "여행 입력 시 할일이 이 목록을 참고해 자동 생성됩니다."}
          </p>

          <div className="space-y-5">
            {groups.map((group, groupIndex) => (
              <div
                key={groupIndex}
                className="rounded-lg border border-slate-100 bg-slate-50/50 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={group.name}
                    onChange={(e) =>
                      updateGroupName(groupIndex, e.target.value)
                    }
                    className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-800"
                    placeholder="구분 이름"
                  />
                  <button
                    type="button"
                    onClick={() => removeGroup(groupIndex)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    구분 삭제
                  </button>
                </div>

                <ul className="space-y-2">
                  {group.items.map((item, itemIndex) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        value={item.label}
                        onChange={(e) =>
                          updateItemLabel(
                            groupIndex,
                            itemIndex,
                            e.target.value,
                          )
                        }
                        className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                      />
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={item.excluded ?? false}
                          onChange={() =>
                            toggleExcluded(groupIndex, itemIndex)
                          }
                          className="rounded border-slate-300"
                        />
                        기본 제외
                      </label>
                      <button
                        type="button"
                        onClick={() => removeItem(groupIndex, itemIndex)}
                        className="text-xs text-slate-400 hover:text-red-600"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => addItem(groupIndex)}
                  className="mt-2 text-xs font-medium text-sky-700 hover:text-sky-900"
                >
                  + 세부 항목 추가
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addGroup}
            className="mt-3 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            + 구분 추가
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>
          )}
          {message && (
            <p className="mt-3 text-sm text-emerald-700">{message}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isPending ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              기본값 복원
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
