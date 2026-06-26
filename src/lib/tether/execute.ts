import type { PoolClient } from "pg";

import { insertAuditEvent, insertTrace } from "../db/trace";
import type { ActionStatus, JsonRecord, ReversibilityClass } from "../domain/types";
import { asJsonRecord } from "./json";

export type ActionRow = {
  id: string;
  org_id: string;
  entity_id: string;
  action_type_key: string;
  proposed_changes: unknown;
  prior_state: unknown;
  status: ActionStatus;
  reversibility_class: ReversibilityClass;
};

export type ExecuteResult = {
  action_id: string;
  status: ActionStatus;
  produced_version_id: string | null;
  result: string;
};

type CurrentVersionRow = {
  current_version_id: string;
  version_number: number;
  state: unknown;
};

type ExistingExecutionRow = {
  produced_version_id: string | null;
  result: string;
};

async function findExistingExecution(
  client: PoolClient,
  actionId: string,
): Promise<ExecuteResult | null> {
  const result = await client.query<ExistingExecutionRow>(
    `SELECT produced_version_id, result
     FROM executions
     WHERE action_id = $1
     LIMIT 1`,
    [actionId],
  );
  const row = result.rows[0];

  if (!row) return null;

  return {
    action_id: actionId,
    status: "executed",
    produced_version_id: row.produced_version_id,
    result: row.result,
  };
}

async function executeExternalSimulation(
  client: PoolClient,
  action: ActionRow,
): Promise<ExecuteResult> {
  const existing = await findExistingExecution(client, action.id);
  if (existing) return existing;

  const resultText =
    action.action_type_key === "refund_reversal"
      ? "simulated_reversal_request_queued"
      : "simulated_external_action_recorded";

  await client.query(
    `INSERT INTO executions
      (org_id, action_id, executed_at, result, produced_version_id, error_text)
     VALUES ($1, $2, now(), $3, $4, $5)`,
    [action.org_id, action.id, resultText, null, null],
  );
  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "INSERT",
    tableName: "executions",
    summary: `Recorded ${resultText}.`,
  });

  await client.query("UPDATE action_proposals SET status = $1 WHERE id = $2", [
    "executed",
    action.id,
  ]);
  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "UPDATE",
    tableName: "action_proposals",
    summary: "Marked external simulation as executed.",
  });
  await insertAuditEvent(client, {
    orgId: action.org_id,
    actionId: action.id,
    eventType: "action_executed",
    payload: {
      result: resultText,
      produced_version_id: null,
    },
  });

  return {
    action_id: action.id,
    status: "executed",
    produced_version_id: null,
    result: resultText,
  };
}

async function loadCurrentVersion(
  client: PoolClient,
  action: ActionRow,
): Promise<CurrentVersionRow> {
  const result = await client.query<CurrentVersionRow>(
    `SELECT be.current_version_id, ev.version_number, ev.state
     FROM business_entities be
     JOIN entity_versions ev ON ev.id = be.current_version_id
     WHERE be.id = $1
       AND be.org_id = $2
     LIMIT 1`,
    [action.entity_id, action.org_id],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("Current entity version not found");
  }

  return row;
}

async function executeVersionedStateChange(
  client: PoolClient,
  action: ActionRow,
): Promise<ExecuteResult> {
  const existing = await findExistingExecution(client, action.id);
  if (existing) return existing;

  const current = await loadCurrentVersion(client, action);
  const currentState = asJsonRecord(current.state);
  const proposedChanges = asJsonRecord(action.proposed_changes);
  const nextState: JsonRecord = {
    ...currentState,
    ...proposedChanges,
  };

  await client.query(
    "UPDATE entity_versions SET is_active = false WHERE entity_id = $1 AND is_active = true",
    [action.entity_id],
  );
  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "UPDATE",
    tableName: "entity_versions",
    summary: "Deactivated prior active entity version.",
  });

  const insertedVersion = await client.query<{ id: string }>(
    `INSERT INTO entity_versions
      (org_id, entity_id, version_number, state, created_by_action_id, is_active)
     VALUES ($1, $2, $3, $4::json, $5, true)
     RETURNING id`,
    [
      action.org_id,
      action.entity_id,
      current.version_number + 1,
      JSON.stringify(nextState),
      action.id,
    ],
  );
  const producedVersionId = insertedVersion.rows[0]?.id;

  if (!producedVersionId) {
    throw new Error("Entity version insert did not return an id");
  }

  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "INSERT",
    tableName: "entity_versions",
    summary: `Appended entity version v${current.version_number + 1}.`,
  });

  await client.query(
    "UPDATE business_entities SET current_version_id = $1 WHERE id = $2",
    [producedVersionId, action.entity_id],
  );
  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "UPDATE",
    tableName: "business_entities",
    summary: `Pointed entity to version v${current.version_number + 1}.`,
  });

  const resultText = "simulated_refund_written";
  await client.query(
    `INSERT INTO executions
      (org_id, action_id, executed_at, result, produced_version_id, error_text)
     VALUES ($1, $2, now(), $3, $4, $5)`,
    [action.org_id, action.id, resultText, producedVersionId, null],
  );
  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "INSERT",
    tableName: "executions",
    summary: "Recorded simulated refund execution.",
  });

  await client.query("UPDATE action_proposals SET status = $1 WHERE id = $2", [
    "executed",
    action.id,
  ]);
  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "UPDATE",
    tableName: "action_proposals",
    summary: "Marked action as executed.",
  });
  await insertAuditEvent(client, {
    orgId: action.org_id,
    actionId: action.id,
    eventType: "action_executed",
    payload: {
      result: resultText,
      produced_version_id: producedVersionId,
      version_number: current.version_number + 1,
    },
  });

  return {
    action_id: action.id,
    status: "executed",
    produced_version_id: producedVersionId,
    result: resultText,
  };
}

export async function executeApprovedAction(
  client: PoolClient,
  action: ActionRow,
): Promise<ExecuteResult> {
  if (action.status === "executed") {
    const existing = await findExistingExecution(client, action.id);
    if (existing) return existing;
  }

  if (action.status !== "approved") {
    throw new Error("Only approved actions can execute");
  }

  if (action.action_type_key === "refund_reversal") {
    return executeExternalSimulation(client, action);
  }

  return executeVersionedStateChange(client, action);
}
