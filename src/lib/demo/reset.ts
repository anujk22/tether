import type { PoolClient } from "pg";

import { writeTransaction } from "../db/client";
import { insertAuditEvent, insertTrace } from "../db/trace";
import { createProposalInTransaction } from "../tether/propose";
import type { ProposeActionInput } from "../tether/propose";
import { runGate } from "../tether/gate";
import { DEMO_IDS } from "./ids";
import { BASE_ENTITY_STATE, seedDemoData } from "./seed";
import { scriptedRefundProposal } from "./scripted-proposal";

async function clearGeneratedDemoState(client: PoolClient): Promise<void> {
  const orgParams = [DEMO_IDS.org];

  await client.query("DELETE FROM approvals WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM executions WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM rollback_events WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM compensation_actions WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM audit_events WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM operation_traces WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM action_proposals WHERE org_id = $1", orgParams);

  await client.query(
    `DELETE FROM entity_versions
     WHERE entity_id = $1
       AND id <> $2`,
    [DEMO_IDS.entity, DEMO_IDS.entityVersionV4],
  );
  await client.query(
    `UPDATE entity_versions
     SET state = $1::json,
       created_by_action_id = NULL,
       is_active = true
     WHERE id = $2`,
    [JSON.stringify(BASE_ENTITY_STATE), DEMO_IDS.entityVersionV4],
  );
  await client.query(
    `UPDATE business_entities
     SET current_version_id = $1
     WHERE id = $2`,
    [DEMO_IDS.entityVersionV4, DEMO_IDS.entity],
  );
}

async function insertQueueProposal(
  client: PoolClient,
  input: ProposeActionInput,
): Promise<void> {
  const priorState = { ...BASE_ENTITY_STATE };
  const actionType = await client.query<{ reversibility_class: string }>(
    `SELECT reversibility_class
     FROM action_types
     WHERE org_id = $1
       AND key = $2
     LIMIT 1`,
    [DEMO_IDS.org, input.action_type],
  );
  const reversibilityClass = actionType.rows[0]?.reversibility_class;

  if (!reversibilityClass) {
    throw new Error("Action type not found for demo queue proposal");
  }

  const gate = await runGate({
    client,
    orgId: DEMO_IDS.org,
    actionTypeKey: input.action_type,
    proposedChanges: input.proposed_changes,
    priorState,
    riskLevel: input.risk_level,
  });
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO action_proposals
      (org_id, agent_id, entity_id, action_type_key, proposed_changes,
       prior_state, rationale, evidence, risk_level, status,
       reversibility_class, idempotency_key)
     VALUES ($1, $2, $3, $4, $5::json, $6::json, $7, $8::json, $9, $10, $11, $12)
     RETURNING id`,
    [
      DEMO_IDS.org,
      input.agent_id,
      input.entity_id,
      input.action_type,
      JSON.stringify(input.proposed_changes),
      JSON.stringify(priorState),
      input.rationale,
      JSON.stringify(input.evidence),
      input.risk_level,
      gate.status,
      reversibilityClass,
      input.idempotency_key,
    ],
  );
  const actionId = inserted.rows[0]?.id;

  if (!actionId) {
    throw new Error("Demo queue proposal insert did not return an id");
  }

  await insertTrace(client, {
    orgId: DEMO_IDS.org,
    actionId,
    operation: "INSERT",
    tableName: "action_proposals",
    summary: `Inserted proposed ${input.action_type} action.`,
  });
  await insertAuditEvent(client, {
    orgId: DEMO_IDS.org,
    actionId,
    eventType: "action_proposed",
    payload: {
      action_type: input.action_type,
      risk_level: input.risk_level,
      evidence: input.evidence,
    },
  });
  await insertTrace(client, {
    orgId: DEMO_IDS.org,
    actionId,
    operation: "UPDATE",
    tableName: "action_proposals",
    summary: `Gate set status to ${gate.status}.`,
  });
  await insertAuditEvent(client, {
    orgId: DEMO_IDS.org,
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
}

export async function resetDemoData() {
  await seedDemoData();

  return writeTransaction(async (client) => {
    await clearGeneratedDemoState(client);
    const canonical = await createProposalInTransaction(
      client,
      scriptedRefundProposal(),
    );

    const supportLeadReview: ProposeActionInput = {
      ...scriptedRefundProposal("demo-issue-refund-cust-8841-475"),
      agent_id: DEMO_IDS.agents.support07,
      proposed_changes: {
        refund_amount: 475,
        refund_status: "pending_refund_475",
        ticket_priority: "elevated",
        customer_health: "watchlist",
        csm_notified: true,
        tier: "pro",
      },
      rationale:
        "SupportAgent-07 found a renewal dispute on a pro account. Tether routes the medium-risk refund to a support lead before any write happens.",
      evidence: [
        {
          label: "Customer report",
          value: "Pro customer reports a partial duplicate charge.",
          source: "support_ticket",
        },
        {
          label: "Payment signal",
          value: "$475 charge flagged for manual support review.",
          source: "simulated_payments",
        },
        {
          label: "Account tier",
          value: "Pro account on watchlist.",
          source: "crm_snapshot",
        },
      ],
      risk_level: "MEDIUM",
    };

    const autoApproved: ProposeActionInput = {
      ...scriptedRefundProposal("demo-issue-refund-cust-8841-50"),
      agent_id: DEMO_IDS.agents.support02,
      proposed_changes: {
        refund_amount: 50,
        refund_status: "pending_refund_50",
        ticket_priority: "normal",
        customer_health: "stable",
        csm_notified: false,
        tier: "standard",
      },
      rationale:
        "SupportAgent-02 proposed a low-risk standard refund under the auto-approval threshold.",
      evidence: [
        {
          label: "Customer report",
          value: "Small billing correction requested by standard customer.",
          source: "support_ticket",
        },
        {
          label: "Payment signal",
          value: "$50 refund falls below the auto-approval threshold.",
          source: "simulated_payments",
        },
        {
          label: "Account tier",
          value: "Standard customer with stable health.",
          source: "crm_snapshot",
        },
      ],
      risk_level: "LOW",
    };

    await insertQueueProposal(client, supportLeadReview);
    await insertQueueProposal(client, autoApproved);

    return canonical;
  });
}
