import { cn } from "@/lib/utils";

interface PageShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  actions?: React.ReactNode;
}

export function PageShell({
  title,
  description,
  children,
  className,
  compact = false,
  actions,
}: PageShellProps) {
  return (
    <main
      className={cn(
        "mx-auto max-w-2xl px-4",
        compact ? "py-4 md:py-5" : "py-5 md:py-8",
        className,
      )}
    >
      <header className={cn(compact ? "mb-3" : "mb-6")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className={cn(
                "font-bold tracking-tight text-foreground",
                compact ? "text-xl" : "text-2xl",
              )}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0 pt-0.5">{actions}</div>}
        </div>
      </header>
      <div className={cn(compact ? "space-y-3" : "space-y-4")}>
        {children}
      </div>
    </main>
  );
}

interface SectionCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
  accentColor?: string;
  accentIcon?: React.ReactNode;
  plain?: boolean;
  headerActions?: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
  noPadding,
  accentColor,
  accentIcon,
  plain = false,
  headerActions,
}: SectionCardProps) {
  const showAccent = !plain && accentColor;

  return (
    <section
      className={cn(
        "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden",
        showAccent && "border-l-[3px]",
        className,
      )}
      style={
        showAccent
          ? { borderLeftColor: accentColor }
          : undefined
      }
    >
      {(title || description) && (
        <div
          className={cn(
            "px-3.5 py-2",
            !plain && "border-b border-border/50",
          )}
        >
          {title && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {showAccent && accentIcon && (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `${accentColor}18`,
                      color: accentColor,
                    }}
                  >
                    {accentIcon}
                  </span>
                )}
                <h2 className="text-sm font-semibold text-foreground">
                  {title}
                </h2>
              </div>
              {headerActions ? (
                <div className="shrink-0">{headerActions}</div>
              ) : null}
            </div>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div
        className={cn(
          noPadding ? "" : "px-3 py-1",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
