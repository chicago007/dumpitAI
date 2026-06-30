"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  persistAppearanceTheme,
  setAppearanceTheme,
} from "@/actions/appearance";
import {
  APPEARANCE_THEMES,
  type AppearanceThemeId,
} from "@/lib/appearance-themes";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface AppearancePickerProps {
  activeTheme: AppearanceThemeId;
}

export function AppearancePicker({ activeTheme }: AppearancePickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(theme: AppearanceThemeId) {
    if (theme === activeTheme || isPending) return;

    startTransition(async () => {
      await setAppearanceTheme(theme);
      await persistAppearanceTheme(theme);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold text-foreground">배경 테마</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        앱 전체 배경색과 카드 톤을 바꿉니다.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {APPEARANCE_THEMES.map((theme) => {
          const isActive = theme.id === activeTheme;

          return (
            <button
              key={theme.id}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(theme.id)}
              className={cn(
                "relative flex flex-col items-start rounded-lg border p-3 text-left transition-colors",
                isActive
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/40",
              )}
              aria-pressed={isActive}
              aria-label={`${theme.label} 테마`}
            >
              <span
                className="mb-2 h-10 w-full rounded-md border border-border/60"
                style={{ backgroundColor: theme.swatch }}
              />
              <span className="text-sm font-medium text-foreground">
                {theme.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {theme.description}
              </span>
              {isActive && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
