import { closeDbPool, transaction } from "../src/lib/db/client";
import { BASE_ENTITY_STATE } from "../src/lib/demo/seed";
import { DEMO_IDS } from "../src/lib/demo/ids";
import { runGate } from "../src/lib/tether/gate";

async function main(): Promise<void> {
  try {
    const result = await transaction((client) =>
      runGate({
        client,
        orgId: DEMO_IDS.org,
        actionTypeKey: "issue_refund",
        proposedChanges: {
          refund_amount: 1250,
          refund_status: "pending_refund_1250",
          ticket_priority: "critical",
          customer_health: "at_risk",
          csm_notified: true,
        },
        priorState: BASE_ENTITY_STATE,
        riskLevel: "HIGH",
      }),
    );

    if (
      result.decision !== "require_approval" ||
      result.requiredApproverRole !== "finance" ||
      result.status !== "approval_required"
    ) {
      throw new Error("Gate check did not route the $1,250 refund to finance");
    }

    console.log("gate:ok finance approval required");
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
