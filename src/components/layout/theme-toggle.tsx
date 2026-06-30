"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import {
  persistAppearanceTheme,
  setAppearanceTheme,
} from "@/actions/appearance";
import type { AppearanceThemeId } from "@/lib/appearance-themes";
import { Button } from "@/components/ui/button";

const DARK_THEMES: AppearanceThemeId[] = ["solarized-dark", "midnight"];

export function ThemeToggle({ activeTheme }: { activeTheme: AppearanceThemeId }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isDark = DARK_THEMES.includes(activeTheme);
  const next: AppearanceThemeId = isDark ? "default" : "midnight";

  function handleToggle() {
    if (isPending) return;
    startTransition(async () => {
      await setAppearanceTheme(next);
      await persistAppearanceTheme(next);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isDark ? "밝은 테마로 전환" : "어두운 테마로 전환"}
      title={isDark ? "밝은 테마" : "어두운 테마"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
