import { APP_NAME, APP_VERSION_LABEL } from "@/lib/app-brand";
import { cn } from "@/lib/utils";

export function AppBrandTitle({
  className,
  versionClassName,
}: {
  className?: string;
  versionClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      {APP_NAME}
      <span
        className={cn(
          "text-xs font-normal tabular-nums text-muted-foreground",
          versionClassName,
        )}
      >
        {APP_VERSION_LABEL}
      </span>
    </span>
  );
}
