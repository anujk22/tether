import { closeDbPool } from "../src/lib/db/client";
import { seedDemoData } from "../src/lib/demo/seed";

async function main(): Promise<void> {
  try {
    await seedDemoData();
    console.log("seed:ok");
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
