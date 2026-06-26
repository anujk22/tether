import { closeDbPool } from "../src/lib/db/client";
import { simulateRetryProof } from "../src/lib/tether/retry-proof";

async function main(): Promise<void> {
  try {
    const proof = await simulateRetryProof();

    if (
      proof.unique_action_count !== 1 ||
      proof.proposal_count !== 1 ||
      proof.execution_count !== 1 ||
      proof.status !== "executed"
    ) {
      throw new Error("Retry proof did not collapse to one proposal/execution");
    }

    console.log(
      `retry-proof:ok action=${proof.action_id} proposal_count=1 execution_count=1`,
    );
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
