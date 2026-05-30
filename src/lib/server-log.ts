type LogLevel = "error" | "warn" | "info";

function formatPayload(context: string, error: unknown): Record<string, unknown> {
  const base: Record<string, unknown> = {
    context,
    ts: new Date().toISOString(),
  };
  if (error instanceof Error) {
    base.message = error.message;
    base.name = error.name;
    if (error.stack) base.stack = error.stack.split("\n").slice(0, 6).join("\n");
  } else if (error != null) {
    base.message = String(error);
  }
  return base;
}

function emit(level: LogLevel, context: string, error: unknown, extra?: Record<string, unknown>) {
  const payload = { ...formatPayload(context, error), ...extra };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(`[1600] ${line}`);
  else if (level === "warn") console.warn(`[1600] ${line}`);
  else console.info(`[1600] ${line}`);
}

export function logServerError(context: string, error: unknown, extra?: Record<string, unknown>) {
  emit("error", context, error, extra);
}

export function logServerWarn(context: string, message: string, extra?: Record<string, unknown>) {
  emit("warn", context, message, extra);
}
