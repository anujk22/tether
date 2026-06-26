import type { PoolClient } from "pg";

import { writeTransaction } from "../db/client";
import { insertAuditEvent, insertTrace } from "../db/trace";
import type { ActionStatus, JsonRecord } from "../domain/types";
import type { ProposeActionInput } from "./propose";
import { createProposalInTransaction } from "./propose";
import type { ActionRow } from "./execute";
import { asJsonRecord } from "./json";

export type RollbackInput = {
  performed_by_user_id: string;
  reason?: string;
};

export type RollbackResult = {
  action_id: string;
  status: ActionStatus;
  restored_version_id: string | null;
  compensation_action_id: string | null;
};

type CurrentVersionRow = {
  version_number: number;
};

type ExistingRollbackRow = {
  restored_version_id: string;
};

type ExistingCompensationRow = {
  compensation_action_id: string;
};

type ActionTypeTemplateRow = {
  compensation_template: unknown;
};

type EntityTypeRow = {
  entity_type: string;
};

async function loadAction(client: PoolClient, actionId: string): Promise<ActionRow> {
  const result = await client.query<ActionRow>(
    `SELECT id, org_id, agent_id, entity_id, action_type_key, proposed_changes,
       prior_state, status, reversibility_class
     FROM action_proposals
     WHERE id = $1
     LIMIT 1`,
    [actionId],
  );
  const action = result.rows[0];

  if (!action) {
    throw new Error("Action not found");
  }

  return action;
}

async function loadCurrentVersionNumber(
  client: PoolClient,
  action: ActionRow,
): Promise<number> {
  const result = await client.query<CurrentVersionRow>(
    `SELECT ev.version_number
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

  return row.version_number;
}

async function loadEntityType(
  client: PoolClient,
  action: ActionRow,
): Promise<string> {
  const result = await client.query<EntityTypeRow>(
    `SELECT entity_type
     FROM business_entities
     WHERE id = $1
       AND org_id = $2
     LIMIT 1`,
    [action.entity_id, action.org_id],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("Business entity not found");
  }

  return row.entity_type;
}

async function findExistingRollback(
  client: PoolClient,
  actionId: string,
): Promise<RollbackResult | null> {
  const rollback = await client.query<ExistingRollbackRow>(
    `SELECT restored_version_id
     FROM rollback_events
     WHERE action_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [actionId],
  );
  const compensation = await client.query<ExistingCompensationRow>(
    `SELECT compensation_action_id
     FROM compensation_actions
     WHERE origin_action_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [actionId],
  );

  const rollbackRow = rollback.rows[0];
  if (!rollbackRow) return null;

  return {
    action_id: actionId,
    status: compensation.rows[0] ? "compensated" : "rolled_back",
    restored_version_id: rollbackRow.restored_version_id,
    compensation_action_id: compensation.rows[0]?.compensation_action_id ?? null,
  };
}

async function restorePriorState(
  client: PoolClient,
  action: ActionRow,
): Promise<string> {
  const currentVersionNumber = await loadCurrentVersionNumber(client, action);
  const restoredState = asJsonRecord(action.prior_state);

  await client.query(
    "UPDATE entity_versions SET is_active = false WHERE entity_id = $1 AND is_active = true",
    [action.entity_id],
  );
  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "UPDATE",
    tableName: "entity_versions",
    summary: "Deactivated current version before rollback restore.",
  });

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO entity_versions
      (org_id, entity_id, version_number, state, created_by_action_id, is_active)
     VALUES ($1, $2, $3, $4::json, $5, true)
     RETURNING id`,
    [
      action.org_id,
      action.entity_id,
      currentVersionNumber + 1,
      JSON.stringify(restoredState),
      action.id,
    ],
  );
  const restoredVersionId = inserted.rows[0]?.id;

  if (!restoredVersionId) {
    throw new Error("Rollback version insert did not return an id");
  }

  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "INSERT",
    tableName: "entity_versions",
    summary: `Appended rollback restore version v${currentVersionNumber + 1}.`,
  });

  await client.query(
    "UPDATE business_entities SET current_version_id = $1 WHERE id = $2",
    [restoredVersionId, action.entity_id],
  );
  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "UPDATE",
    tableName: "business_entities",
    summary: `Pointed entity to rollback version v${currentVersionNumber + 1}.`,
  });

  return restoredVersionId;
}

async function loadCompensationTemplate(
  client: PoolClient,
  action: ActionRow,
): Promise<JsonRecord> {
  const result = await client.query<ActionTypeTemplateRow>(
    `SELECT compensation_template
     FROM action_types
     WHERE org_id = $1
       AND key = $2
     LIMIT 1`,
    [action.org_id, action.action_type_key],
  );

  return asJsonRecord(result.rows[0]?.compensation_template);
}

async function createCompensationAction(
  client: PoolClient,
  action: ActionRow,
  reason: string,
): Promise<string | null> {
  const template = await loadCompensationTemplate(client, action);
  const actionTypeKey = template.action_type_key;

  if (typeof actionTypeKey !== "string") {
    return null;
  }

  const entityType = await loadEntityType(client, action);
  const originalChanges = asJsonRecord(action.proposed_changes);
  const templateChanges = asJsonRecord(template.proposed_changes);
  const proposedChanges: JsonRecord = {
    ...templateChanges,
    refund_amount: originalChanges.refund_amount,
    origin_action_id: action.id,
    original_action_type: action.action_type_key,
  };
  const compensationInput: ProposeActionInput = {
    agent_id: action.agent_id,
    entity_id: action.entity_id,
    entity_type: entityType,
    action_type: actionTypeKey,
    proposed_changes: proposedChanges,
    rationale:
      "Rollback restored internal state. Because the original refund is an external effect, Tether is routing a simulated reversal request as compensation.",
    evidence: [
      {
        label: "Rollback reason",
        value: reason,
        source: "human_approval",
      },
      {
        label: "Original action",
        value: action.id,
        source: "tether_ledger",
      },
    ],
    risk_level: "MEDIUM",
    idempotency_key: `compensation:${action.id}`,
  };
  const compensation = await createProposalInTransaction(client, compensationInput);

  await client.query(
    `INSERT INTO compensation_actions
      (org_id, origin_action_id, compensation_action_id, reason)
     VALUES ($1, $2, $3, $4)`,
    [action.org_id, action.id, compensation.action_id, reason],
  );
  await insertTrace(client, {
    orgId: action.org_id,
    actionId: action.id,
    operation: "INSERT",
    tableName: "compensation_actions",
    summary: `Linked compensation action ${compensation.action_id}.`,
  });

  return compensation.action_id;
}

export async function rollbackAction(
  actionId: string,
  input: RollbackInput,
): Promise<RollbackResult> {
  return writeTransaction(async (client) => {
    const action = await loadAction(client, actionId);

    if (action.status === "rolled_back" || action.status === "compensated") {
      const existing = await findExistingRollback(client, actionId);
      if (existing) return existing;
    }

    if (action.status !== "executed") {
      throw new Error(`Action cannot be rolled back from status ${action.status}`);
    }

    const reason = input.reason ?? "Human approver requested rollback.";
    const restoredVersionId = await restorePriorState(client, action);

    await client.query(
      `INSERT INTO rollback_events
        (org_id, action_id, restored_version_id, performed_by_user_id)
       VALUES ($1, $2, $3, $4)`,
      [action.org_id, action.id, restoredVersionId, input.performed_by_user_id],
    );
    await insertTrace(client, {
      orgId: action.org_id,
      actionId: action.id,
      operation: "INSERT",
      tableName: "rollback_events",
      summary: `Recorded rollback to restored version ${restoredVersionId}.`,
    });
    await insertAuditEvent(client, {
      orgId: action.org_id,
      actionId: action.id,
      eventType: "rollback_performed",
      payload: {
        restored_version_id: restoredVersionId,
        reason,
      },
    });

    const compensationActionId =
      action.reversibility_class === "IRREVERSIBLE_EXTERNAL"
        ? await createCompensationAction(client, action, reason)
        : null;
    const status: ActionStatus = compensationActionId ? "compensated" : "rolled_back";

    await client.query("UPDATE action_proposals SET status = $1 WHERE id = $2", [
      status,
      action.id,
    ]);
    await insertTrace(client, {
      orgId: action.org_id,
      actionId: action.id,
      operation: "UPDATE",
      tableName: "action_proposals",
      summary: `Marked action as ${status}.`,
    });

    return {
      action_id: action.id,
      status,
      restored_version_id: restoredVersionId,
      compensation_action_id: compensationActionId,
    };
  });
}
