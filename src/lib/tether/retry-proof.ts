import { query } from "../db/client";
import { DEMO_IDS } from "../demo/ids";
import { scriptedRefundProposal } from "../demo/scripted-proposal";
import { decideAction } from "./decision";
import { proposeAction, type ProposeActionResult } from "./propose";

export type RetryProofAttempt = {
  attempt: number;
  action_id: string;
  status: string;
  deduped: boolean;
};

export type RetryProofResult = {
  idempotency_key: string;
  attempts: RetryProofAttempt[];
  action_id: string;
  unique_action_count: number;
  proposal_count: number;
  execution_count: number;
  status: string;
};

type CountRow = {
  count: number;
};

function attemptResult(attempt: number, result: ProposeActionResult): RetryProofAttempt {
  return {
    attempt,
    action_id: result.action_id,
    status: result.status,
    deduped: result.deduped,
  };
}

export async function simulateRetryProof(): Promise<RetryProofResult> {
  const idempotencyKey = `retry-demo-${Date.now()}`;
  const attempts = await Promise.all(
    [1, 2, 3].map(async (attempt) =>
      attemptResult(
        attempt,
        await proposeAction(scriptedRefundProposal(idempotencyKey)),
      ),
    ),
  );
  const uniqueActionIds = Array.from(
    new Set(attempts.map((attempt) => attempt.action_id)),
  );
  const actionId = uniqueActionIds[0];

  if (!actionId || uniqueActionIds.length !== 1) {
    throw new Error("Retry proof produced more than one action");
  }

  const decision = await decideAction(actionId, {
    decision: "approve",
    note: "Retry proof approval for exactly-once execution.",
    approver_user_id: DEMO_IDS.users.finance,
  });
  const proposalCount = await query<CountRow>(
    "SELECT count(*)::int AS count FROM action_proposals WHERE idempotency_key = $1",
    [idempotencyKey],
  );
  const executionCount = await query<CountRow>(
    "SELECT count(*)::int AS count FROM executions WHERE action_id = $1",
    [actionId],
  );

  return {
    idempotency_key: idempotencyKey,
    attempts,
    action_id: actionId,
    unique_action_count: uniqueActionIds.length,
    proposal_count: proposalCount.rows[0]?.count ?? 0,
    execution_count: executionCount.rows[0]?.count ?? 0,
    status: decision.status,
  };
}
