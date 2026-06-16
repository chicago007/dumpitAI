export function CategoryDot({
  color,
  size = "sm",
}: {
  color: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "h-3 w-3" : "h-2 w-2";

  return (
    <span
      className={`inline-block shrink-0 rounded-full ${sizeClass}`}
      style={{ backgroundColor: color }}
    />
  );
}
