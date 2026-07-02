export function isSchemaSetupError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

export function isMissingDbColumnError(error: unknown, column?: string) {
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  if (
    !message.includes("does not exist") &&
    !message.includes("Could not find")
  ) {
    return false;
  }

  if (!message.includes("column")) return false;
  if (!column) return true;
  return message.includes(column);
}

export function isActivitySchemaError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "");

  return (
    isSchemaSetupError(error) ||
    isMissingDbColumnError(error, "activity_key") ||
    isMissingDbColumnError(error, "custom_activity_types")
  );
}
