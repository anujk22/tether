import { closeDbPool, query } from "../src/lib/db/client";
import { DEMO_IDS } from "../src/lib/demo/ids";
import { scriptedRefundProposal } from "../src/lib/demo/scripted-proposal";
import { decideAction } from "../src/lib/tether/decision";
import { proposeAction } from "../src/lib/tether/propose";

type CurrentVersionRow = {
  version_number: number;
  refund_status: string;
  ticket_priority: string;
  customer_health: string;
  csm_notified: boolean;
};

type ExecutionRow = {
  count: number;
};

async function main(): Promise<void> {
  try {
    const proposal = await proposeAction(scriptedRefundProposal());

    if (proposal.status === "compensated") {
      const execution = await query<ExecutionRow>(
        `SELECT count(*)::int AS count
         FROM executions
         WHERE action_id = $1
           AND result = 'simulated_refund_written'`,
        [proposal.action_id],
      );

      if (!execution.rows[0]?.count) {
        throw new Error("Compensated action has no original execution row");
      }

      console.log(`decision:ok action=${proposal.action_id} already_compensated`);
      return;
    }

    const decision = await decideAction(proposal.action_id, {
      decision: "approve",
      note: "Finance approval for duplicate-charge remediation.",
      approver_user_id: DEMO_IDS.users.finance,
    });

    if (
      decision.status !== "executed" ||
      decision.execution?.result !== "simulated_refund_written" ||
      !decision.execution.produced_version_id
    ) {
      throw new Error("Approval did not execute the scripted refund");
    }

    const current = await query<CurrentVersionRow>(
      `SELECT ev.version_number,
        ev.state->>'refund_status' AS refund_status,
        ev.state->>'ticket_priority' AS ticket_priority,
        ev.state->>'customer_health' AS customer_health,
        (ev.state->>'csm_notified')::bool AS csm_notified
       FROM business_entities be
       JOIN entity_versions ev ON ev.id = be.current_version_id
       WHERE be.id = $1`,
      [DEMO_IDS.entity],
    );
    const row = current.rows[0];

    if (
      row?.version_number !== 5 ||
      row.refund_status !== "pending_refund_1250" ||
      row.ticket_priority !== "critical" ||
      row.customer_health !== "at_risk" ||
      row.csm_notified !== true
    ) {
      throw new Error("Current entity state did not advance to v5");
    }

    console.log(`decision:ok action=${proposal.action_id} version=5`);
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
