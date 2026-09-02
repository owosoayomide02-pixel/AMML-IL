export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "APP_ERROR", status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message && !looksTechnical(error.message)) {
    return error.message;
  }
  return fallback;
}

function looksTechnical(message: string) {
  return /postgres|supabase|rls|sql|stack|undefined|null is not|ECONN|auth\./i.test(message);
}

export function logError(context: string, error: unknown) {
  const details = error instanceof Error ? { message: error.message, stack: error.stack } : { error };
  console.error(`[${context}]`, details);
}
