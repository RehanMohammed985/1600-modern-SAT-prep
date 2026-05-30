/** Detect Next.js redirect() — must rethrow, not treat as failure */
export function isNextRedirect(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: string }).digest;
  return typeof digest === "string" && digest.includes("NEXT_REDIRECT");
}

export function actionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

/** Rethrow framework errors (redirect, dynamic rendering) — do not treat as app failures */
export function rethrowFrameworkError(error: unknown): void {
  if (isNextRedirect(error)) throw error;
  if (error instanceof Error && error.message.includes("Dynamic server usage")) throw error;
}
