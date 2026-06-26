import { closeDbPool } from "../src/lib/db/client";
import { migrate } from "../src/lib/db/migrations";

async function main(): Promise<void> {
  try {
    await migrate();
    console.log("migrate:ok");
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
