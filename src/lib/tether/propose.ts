import type { PoolClient } from "pg";

import { query, writeTransaction } from "../db/client";
import { insertAuditEvent, insertTrace } from "../db/trace";
import { isSqlState, UNIQUE_VIOLATION } from "../db/retry";
import type {
  ActionStatus,
  EvidenceItem,
  GateDecision,
  JsonRecord,
  ReversibilityClass,
  UserRole,
} from "../domain/types";
import { runGate } from "./gate";
import { executeApprovedAction } from "./execute";
import { asJsonArray, asJsonRecord } from "./json";

export type ProposeActionInput = {
  agent_id: string;
  entity_type: string;
  entity_id: string;
  action_type: string;
  proposed_changes: JsonRecord;
  rationale: string;
  evidence: EvidenceItem[];
  risk_level: string;
  idempotency_key: string;
};

export type ProposeActionResult = {
  action_id: string;
  status: ActionStatus;
  gate_decision: GateDecision;
  required_approver_role: UserRole | null;
  reversibility_class: ReversibilityClass;
  prior_state: JsonRecord;
  deduped: boolean;
};

type AgentRow = {
  org_id: string;
};

type EntityRow = {
  entity_type: string;
  state: unknown;
};

type ActionTypeRow = {
  reversibility_class: ReversibilityClass;
};

type ProposalRow = {
  id: string;
  status: ActionStatus;
  reversibility_class: ReversibilityClass;
  prior_state: unknown;
};

type GateAuditRow = {
  payload: unknown;
};

function assertProposalInput(input: ProposeActionInput): void {
  if (!input.agent_id) throw new Error("agent_id is required");
  if (!input.entity_id) throw new Error("entity_id is required");
  if (!input.entity_type) throw new Error("entity_type is required");
  if (!input.action_type) throw new Error("action_type is required");
  if (!input.idempotency_key) throw new Error("idempotency_key is required");
  if (!input.proposed_changes || typeof input.proposed_changes !== "object") {
    throw new Error("proposed_changes must be an object");
  }
}

async function findExistingProposal(
  idempotencyKey: string,
): Promise<ProposeActionResult | null> {
  const proposal = await query<ProposalRow>(
    `SELECT id, status, reversibility_class, prior_state
     FROM action_proposals
     WHERE idempotency_key = $1
     LIMIT 1`,
    [idempotencyKey],
  );

  const row = proposal.rows[0];
  if (!row) return null;

  const gateAudit = await query<GateAuditRow>(
    `SELECT payload
     FROM audit_events
     WHERE action_id = $1
       AND event_type = 'gate_decided'
     ORDER BY created_at DESC
     LIMIT 1`,
    [row.id],
  );
  const payload = asJsonRecord(gateAudit.rows[0]?.payload);

  return {
    action_id: row.id,
    status: row.status,
    gate_decision: (payload.decision as GateDecision | undefined) ?? "deny",
    required_approver_role:
      (payload.required_approver_role as UserRole | undefined) ?? null,
    reversibility_class: row.reversibility_class,
    prior_state: asJsonRecord(row.prior_state),
    deduped: true,
  };
}

async function loadAgent(client: PoolClient, agentId: string): Promise<AgentRow> {
  const result = await client.query<AgentRow>(
    "SELECT org_id FROM agents WHERE id = $1 LIMIT 1",
    [agentId],
  );

  const row = result.rows[0];
  if (!row) throw new Error("Agent not found");

  return row;
}

async function loadEntity(
  client: PoolClient,
  orgId: string,
  entityId: string,
): Promise<EntityRow> {
  const result = await client.query<EntityRow>(
    `SELECT be.entity_type, ev.state
     FROM business_entities be
     JOIN entity_versions ev ON ev.id = be.current_version_id
     WHERE be.id = $1
       AND be.org_id = $2
     LIMIT 1`,
    [entityId, orgId],
  );

  const row = result.rows[0];
  if (!row) throw new Error("Business entity not found");

  return row;
}

async function loadActionType(
  client: PoolClient,
  orgId: string,
  actionTypeKey: string,
): Promise<ActionTypeRow> {
  const result = await client.query<ActionTypeRow>(
    `SELECT reversibility_class
     FROM action_types
     WHERE org_id = $1
       AND key = $2
     LIMIT 1`,
    [orgId, actionTypeKey],
  );

  const row = result.rows[0];
  if (!row) throw new Error("Action type not found");

  return row;
}

async function createProposal(
  input: ProposeActionInput,
): Promise<ProposeActionResult> {
  return writeTransaction(async (client) => {
    const agent = await loadAgent(client, input.agent_id);
    const entity = await loadEntity(client, agent.org_id, input.entity_id);

    if (entity.entity_type !== input.entity_type) {
      throw new Error("Entity type does not match the requested action");
    }

    const actionType = await loadActionType(client, agent.org_id, input.action_type);
    const priorState = asJsonRecord(entity.state);

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO action_proposals
        (org_id, agent_id, entity_id, action_type_key, proposed_changes,
         prior_state, rationale, evidence, risk_level, status,
         reversibility_class, idempotency_key)
       VALUES ($1, $2, $3, $4, $5::json, $6::json, $7, $8::json, $9, $10, $11, $12)
       RETURNING id`,
      [
        agent.org_id,
        input.agent_id,
        input.entity_id,
        input.action_type,
        JSON.stringify(input.proposed_changes),
        JSON.stringify(priorState),
        input.rationale,
        JSON.stringify(input.evidence),
        input.risk_level,
        "proposed",
        actionType.reversibility_class,
        input.idempotency_key,
      ],
    );
    const actionId = inserted.rows[0]?.id;

    if (!actionId) {
      throw new Error("Proposal insert did not return an id");
    }

    await insertTrace(client, {
      orgId: agent.org_id,
      actionId,
      operation: "INSERT",
      tableName: "action_proposals",
      summary: `Inserted proposed ${input.action_type} action.`,
    });
    await insertAuditEvent(client, {
      orgId: agent.org_id,
      actionId,
      eventType: "action_proposed",
      payload: {
        action_type: input.action_type,
        risk_level: input.risk_level,
        evidence: asJsonArray(input.evidence),
      },
    });

    const gate = await runGate({
      client,
      orgId: agent.org_id,
      actionTypeKey: input.action_type,
      proposedChanges: input.proposed_changes,
      priorState,
      riskLevel: input.risk_level,
    });

    await client.query("UPDATE action_proposals SET status = $1 WHERE id = $2", [
      gate.status,
      actionId,
    ]);
    await insertTrace(client, {
      orgId: agent.org_id,
      actionId,
      operation: "UPDATE",
      tableName: "action_proposals",
      summary: `Gate set status to ${gate.status}.`,
    });
    await insertAuditEvent(client, {
      orgId: agent.org_id,
      actionId,
      eventType: "gate_decided",
      payload: {
        decision: gate.decision,
        status: gate.status,
        required_approver_role: gate.requiredApproverRole,
        matched_rule_id: gate.matchedRuleId,
        policy_title: gate.policyTitle,
      },
    });

    if (gate.decision === "auto_approve") {
      const execution = await executeApprovedAction(client, {
        id: actionId,
        org_id: agent.org_id,
        entity_id: input.entity_id,
        action_type_key: input.action_type,
        proposed_changes: input.proposed_changes,
        prior_state: priorState,
        status: "approved",
        reversibility_class: actionType.reversibility_class,
      });

      return {
        action_id: actionId,
        status: execution.status,
        gate_decision: gate.decision,
        required_approver_role: gate.requiredApproverRole,
        reversibility_class: actionType.reversibility_class,
        prior_state: priorState,
        deduped: false,
      };
    }

    return {
      action_id: actionId,
      status: gate.status,
      gate_decision: gate.decision,
      required_approver_role: gate.requiredApproverRole,
      reversibility_class: actionType.reversibility_class,
      prior_state: priorState,
      deduped: false,
    };
  });
}

export async function proposeAction(
  input: ProposeActionInput,
): Promise<ProposeActionResult> {
  assertProposalInput(input);

  const existing = await findExistingProposal(input.idempotency_key);
  if (existing) return existing;

  try {
    return await createProposal(input);
  } catch (error) {
    if (isSqlState(error, UNIQUE_VIOLATION)) {
      const racedExisting = await findExistingProposal(input.idempotency_key);
      if (racedExisting) return racedExisting;
    }

    throw error;
  }
}
