import { closeDbPool, query } from "../src/lib/db/client";

async function main(): Promise<void> {
  try {
    const result = await query<{ ok: number; now: string }>(
      "SELECT 1::int AS ok, now()::text AS now",
    );
    const row = result.rows[0];

    if (row?.ok !== 1) {
      throw new Error("DSQL health query returned an unexpected result");
    }

    console.log("dsql:connected");
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
