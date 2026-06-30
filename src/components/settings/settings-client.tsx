"use client";

import { useState, useTransition } from "react";
import type { Category } from "@/lib/types";
import type { AppearanceThemeId } from "@/lib/appearance-themes";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/actions/categories";
import { AppearancePicker } from "@/components/settings/appearance-picker";
import { CategoryDot } from "@/components/ui/category-dot";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SettingsClientProps {
  categories: Category[];
  appearanceTheme: AppearanceThemeId;
}

export function SettingsClient({
  categories,
  appearanceTheme,
}: SettingsClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 카테고리를 삭제할까요? 항목은 기타로 이동합니다.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteCategory(id);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제 실패");
      }
    });
  }

  return (
    <div className="space-y-6">
      <AppearancePicker activeTheme={appearanceTheme} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">내 카테고리</h2>
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setEditing(null);
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            + 추가
          </button>
        </div>

        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <CategoryDot color={cat.color} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {cat.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {(cat.keywords ?? []).join(", ") || "키워드 없음"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing(cat);
                  setIsAdding(false);
                }}
                className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                편집
              </button>
              {cat.name !== "기타" && (
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={isPending}
                  className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  삭제
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {(isAdding || editing) && (
        <CategoryForm
          category={editing}
          onClose={() => {
            setEditing(null);
            setIsAdding(false);
          }}
          onError={setError}
        />
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">계정</h2>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          로그아웃
        </button>
      </section>
    </div>
  );
}

function CategoryForm({
  category,
  onClose,
  onError,
}: {
  category: Category | null;
  onClose: () => void;
  onError: (msg: string | null) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? "#9CA3AF");
  const [keywords, setKeywords] = useState(
    (category?.keywords ?? []).join(", "),
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const keywordList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        if (category) {
          await updateCategory(category.id, {
            name,
            icon: category.icon,
            color,
            keywords: keywordList,
          });
        } else {
          await createCategory({
            name,
            icon: "·",
            color,
            keywords: keywordList,
          });
        }
        onError(null);
        onClose();
      } catch (err) {
        onError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <h3 className="text-sm font-semibold text-foreground">
        {category ? "카테고리 편집" : "카테고리 추가"}
      </h3>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름"
        required
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground">색상</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-input"
        />
      </div>
      <input
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="키워드 (쉼표 구분)"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground"
        >
          취소
        </button>
      </div>
    </form>
  );
}
