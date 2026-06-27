import { closeDbPool } from "../src/lib/db/client";
import { resetDemoData } from "../src/lib/demo/reset";

async function main(): Promise<void> {
  try {
    const result = await resetDemoData();
    console.log(
      `demo:reset action=${result.action_id} status=${result.status} decision=${result.gate_decision}`,
    );
  } finally {
    await closeDbPool();
  }
}

void main();
