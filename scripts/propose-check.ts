import { closeDbPool } from "../src/lib/db/client";
import { scriptedRefundProposal } from "../src/lib/demo/scripted-proposal";
import { proposeAction } from "../src/lib/tether/propose";

async function main(): Promise<void> {
  try {
    const result = await proposeAction(scriptedRefundProposal());

    if (
      !["approval_required", "executed"].includes(result.status) ||
      result.gate_decision !== "require_approval" ||
      result.required_approver_role !== "finance" ||
      result.prior_state.refund_status !== "none"
    ) {
      throw new Error("Scripted proposal did not gate to finance approval");
    }

    const deduped = await proposeAction(scriptedRefundProposal());

    if (deduped.action_id !== result.action_id || !deduped.deduped) {
      throw new Error("Sequential idempotency check did not return existing proposal");
    }

    console.log(`propose:ok action=${result.action_id}`);
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
