import { closeDbPool, query } from "../src/lib/db/client";
import { DEMO_IDS } from "../src/lib/demo/ids";
import { scriptedRefundProposal } from "../src/lib/demo/scripted-proposal";
import { decideAction } from "../src/lib/tether/decision";
import { proposeAction } from "../src/lib/tether/propose";
import { rollbackAction } from "../src/lib/tether/rollback";

type CurrentVersionRow = {
  version_number: number;
  refund_status: string;
  ticket_priority: string;
  customer_health: string;
  csm_notified: boolean;
};

type CompensationRow = {
  status: string;
  action_type_key: string;
};

async function main(): Promise<void> {
  try {
    const proposal = await proposeAction(scriptedRefundProposal());

    if (proposal.status !== "executed" && proposal.status !== "compensated") {
      await decideAction(proposal.action_id, {
        decision: "approve",
        note: "Finance approval before rollback verification.",
        approver_user_id: DEMO_IDS.users.finance,
      });
    }

    const rollback = await rollbackAction(proposal.action_id, {
      performed_by_user_id: DEMO_IDS.users.finance,
      reason: "The duplicate charge signal was later found to be incorrect.",
    });

    if (
      rollback.status !== "compensated" ||
      !rollback.restored_version_id ||
      !rollback.compensation_action_id
    ) {
      throw new Error("Rollback did not restore and compensate");
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
      row?.version_number !== 6 ||
      row.refund_status !== "none" ||
      row.ticket_priority !== "normal" ||
      row.customer_health !== "stable" ||
      row.csm_notified !== false
    ) {
      throw new Error("Rollback did not restore v4 state as v6");
    }

    const compensation = await query<CompensationRow>(
      `SELECT status, action_type_key
       FROM action_proposals
       WHERE id = $1`,
      [rollback.compensation_action_id],
    );
    const compensationRow = compensation.rows[0];

    if (
      compensationRow?.status !== "executed" ||
      compensationRow.action_type_key !== "refund_reversal"
    ) {
      throw new Error("Compensation action was not routed and executed");
    }

    const secondRollback = await rollbackAction(proposal.action_id, {
      performed_by_user_id: DEMO_IDS.users.finance,
      reason: "Idempotency verification.",
    });

    if (secondRollback.restored_version_id !== rollback.restored_version_id) {
      throw new Error("Rollback idempotency returned a different restored version");
    }

    console.log(
      `rollback:ok action=${proposal.action_id} restored=v6 compensation=${rollback.compensation_action_id}`,
    );
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
