import {
  UNIQUE_VIOLATION,
  withRetry,
  type SqlStateError,
} from "../src/lib/db/retry";

async function main(): Promise<void> {
  let attempts = 0;

  const result = await withRetry(
    async () => {
      attempts += 1;

      if (attempts < 3) {
        const error = new Error("simulated OCC conflict") as SqlStateError;
        error.code = "40001";
        throw error;
      }

      return "ok";
    },
    { baseDelayMs: 1 },
  );

  if (result !== "ok" || attempts !== 3) {
    throw new Error("withRetry did not retry serialization failures correctly");
  }

  let uniqueAttempts = 0;

  try {
    await withRetry(async () => {
      uniqueAttempts += 1;
      const error = new Error("simulated duplicate key") as SqlStateError;
      error.code = UNIQUE_VIOLATION;
      throw error;
    });
  } catch (error) {
    if (
      (error as SqlStateError).code !== UNIQUE_VIOLATION ||
      uniqueAttempts !== 1
    ) {
      throw error;
    }
  }

  console.log("retry:ok");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
