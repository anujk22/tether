import { closeDbPool } from "../src/lib/db/client";
import { scriptedRefundProposal } from "../src/lib/demo/scripted-proposal";
import { proposeAction } from "../src/lib/tether/propose";

async function main(): Promise<void> {
  try {
    const idempotencyKey = `race-check-${Date.now()}`;
    const attempts = await Promise.all(
      Array.from({ length: 3 }, () =>
        proposeAction(scriptedRefundProposal(idempotencyKey)),
      ),
    );
    const actionIds = new Set(attempts.map((attempt) => attempt.action_id));

    if (actionIds.size !== 1) {
      throw new Error("Concurrent idempotency race created multiple proposals");
    }

    if (!attempts.some((attempt) => attempt.deduped)) {
      throw new Error("Concurrent idempotency race did not report any deduped result");
    }

    console.log(`propose:race:ok action=${attempts[0]?.action_id}`);
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
