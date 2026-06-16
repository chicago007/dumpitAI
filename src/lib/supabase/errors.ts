export function isSchemaSetupError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}
