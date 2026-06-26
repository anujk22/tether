export const SERIALIZATION_FAILURE = "40001";
export const UNIQUE_VIOLATION = "23505";

export type SqlStateError = Error & {
  code?: string;
};

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

export function isSqlState(error: unknown, code: string): error is SqlStateError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as SqlStateError).code === code,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(attempt: number, baseDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * baseDelayMs);

  return exponential + jitter;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 35;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const canRetry =
        isSqlState(error, SERIALIZATION_FAILURE) && attempt < maxAttempts;

      if (!canRetry) {
        throw error;
      }

      await sleep(retryDelay(attempt, baseDelayMs));
    }
  }

  throw new Error("withRetry exhausted without returning or throwing");
}
