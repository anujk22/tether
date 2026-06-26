import type { PoolClient } from "pg";

import { writeTransaction } from "../db/client";
import { DEMO_IDS } from "./ids";

export const BASE_ENTITY_STATE = {
  customer_id: "cust_8841",
  tier: "enterprise",
  refund_status: "none",
  ticket_priority: "normal",
  customer_health: "stable",
  csm_notified: false,
} as const;

const policyRules = {
  refund_thresholds: [
    { max_exclusive: 100, decision: "auto_approve" },
    {
      min_inclusive: 100,
      max_inclusive: 500,
      decision: "require_approval",
      required_approver_role: "support_lead",
    },
    {
      min_exclusive: 500,
      decision: "require_approval",
      required_approver_role: "finance",
    },
  ],
  enterprise_churn_risk: {
    decision: "require_approval",
    required_approver_role: "csm",
  },
  duplicate_charge: {
    prioritize: true,
  },
};

async function upsertOrganization(client: PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO organizations (id, name)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [DEMO_IDS.org, "Tether Demo Co."],
  );
}

async function upsertUsers(client: PoolClient): Promise<void> {
  const users = [
    [
      DEMO_IDS.users.supportLead,
      "Maya Support",
      "maya.support@example.com",
      "support_lead",
    ],
    [DEMO_IDS.users.finance, "Iris Finance", "iris.finance@example.com", "finance"],
    [DEMO_IDS.users.csm, "Noor CSM", "noor.csm@example.com", "csm"],
  ];

  for (const [id, name, email, role] of users) {
    await client.query(
      `INSERT INTO users (id, org_id, name, email, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         org_id = EXCLUDED.org_id,
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         role = EXCLUDED.role`,
      [id, DEMO_IDS.org, name, email, role],
    );
  }
}

async function upsertAgent(client: PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO agents (id, org_id, name, description)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       org_id = EXCLUDED.org_id,
       name = EXCLUDED.name,
       description = EXCLUDED.description`,
    [
      DEMO_IDS.agent,
      DEMO_IDS.org,
      "SupportAgent-04",
      "Scripted support agent fixture for the Tether control-plane demo.",
    ],
  );
}

async function upsertPolicy(client: PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO company_policies
      (id, org_id, title, body_text, structured_rules, source)
     VALUES ($1, $2, $3, $4, $5::json, $6)
     ON CONFLICT (id) DO UPDATE SET
       org_id = EXCLUDED.org_id,
       title = EXCLUDED.title,
       body_text = EXCLUDED.body_text,
       structured_rules = EXCLUDED.structured_rules,
       source = EXCLUDED.source`,
    [
      DEMO_IDS.policy,
      DEMO_IDS.org,
      "Refund authority and customer-risk routing",
      "Refunds under $100 are auto-approved. Refunds from $100 to $500 require support lead approval. Refunds over $500 require finance approval. Enterprise churn-risk cases can be escalated to the CSM. Duplicate-charge refunds should be prioritized.",
      JSON.stringify(policyRules),
      "Seeded policy fixture",
    ],
  );
}

async function upsertActionTypes(client: PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO action_types
      (id, org_id, key, display_name, reversibility_class, compensation_template)
     VALUES ($1, $2, $3, $4, $5, $6::json)
     ON CONFLICT (id) DO UPDATE SET
       org_id = EXCLUDED.org_id,
       key = EXCLUDED.key,
       display_name = EXCLUDED.display_name,
       reversibility_class = EXCLUDED.reversibility_class,
       compensation_template = EXCLUDED.compensation_template`,
    [
      DEMO_IDS.actionTypes.issueRefund,
      DEMO_IDS.org,
      "issue_refund",
      "Issue refund",
      "IRREVERSIBLE_EXTERNAL",
      JSON.stringify({
        action_type_key: "refund_reversal",
        reason: "Original refund action was rolled back by a human approver.",
        proposed_changes: {
          reversal_request_status: "queued",
          external_system: "simulated_payments",
        },
      }),
    ],
  );

  await client.query(
    `INSERT INTO action_types
      (id, org_id, key, display_name, reversibility_class, compensation_template)
     VALUES ($1, $2, $3, $4, $5, $6::json)
     ON CONFLICT (id) DO UPDATE SET
       org_id = EXCLUDED.org_id,
       key = EXCLUDED.key,
       display_name = EXCLUDED.display_name,
       reversibility_class = EXCLUDED.reversibility_class,
       compensation_template = EXCLUDED.compensation_template`,
    [
      DEMO_IDS.actionTypes.refundReversal,
      DEMO_IDS.org,
      "refund_reversal",
      "Request refund reversal",
      "IRREVERSIBLE_EXTERNAL",
      JSON.stringify(null),
    ],
  );
}

async function upsertApprovalRules(client: PoolClient): Promise<void> {
  const rules = [
    [
      DEMO_IDS.approvalRules.highRefundFinance,
      "issue_refund",
      { field: "refund_amount", op: "gt", value: 500 },
      "require_approval",
      "finance",
      10,
    ],
    [
      DEMO_IDS.approvalRules.midRefundSupportLead,
      "issue_refund",
      { field: "refund_amount", op: "between", min: 100, max: 500 },
      "require_approval",
      "support_lead",
      20,
    ],
    [
      DEMO_IDS.approvalRules.lowRefundAuto,
      "issue_refund",
      { field: "refund_amount", op: "lt", value: 100 },
      "auto_approve",
      null,
      30,
    ],
    [
      DEMO_IDS.approvalRules.enterpriseChurnCsm,
      "issue_refund",
      {
        all: [
          { field: "tier", source: "prior_state", op: "eq", value: "enterprise" },
          {
            field: "customer_health",
            source: "proposed_changes",
            op: "eq",
            value: "at_risk",
          },
        ],
      },
      "require_approval",
      "csm",
      40,
    ],
    [
      DEMO_IDS.approvalRules.refundReversalAuto,
      "refund_reversal",
      { always: true },
      "auto_approve",
      null,
      10,
    ],
  ];

  for (const [id, actionTypeKey, condition, decision, role, priority] of rules) {
    await client.query(
      `INSERT INTO approval_rules
        (id, org_id, action_type_key, condition, decision, required_approver_role, priority)
       VALUES ($1, $2, $3, $4::json, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         org_id = EXCLUDED.org_id,
         action_type_key = EXCLUDED.action_type_key,
         condition = EXCLUDED.condition,
         decision = EXCLUDED.decision,
         required_approver_role = EXCLUDED.required_approver_role,
         priority = EXCLUDED.priority`,
      [
        id,
        DEMO_IDS.org,
        actionTypeKey,
        JSON.stringify(condition),
        decision,
        role,
        priority,
      ],
    );
  }
}

async function upsertBusinessEntity(client: PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO business_entities
      (id, org_id, entity_type, external_ref, current_version_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       org_id = EXCLUDED.org_id,
       entity_type = EXCLUDED.entity_type,
       external_ref = EXCLUDED.external_ref,
       current_version_id = EXCLUDED.current_version_id`,
    [
      DEMO_IDS.entity,
      DEMO_IDS.org,
      "customer",
      "cust_8841",
      DEMO_IDS.entityVersionV4,
    ],
  );

  await client.query(
    `INSERT INTO entity_versions
      (id, org_id, entity_id, version_number, state, created_by_action_id, is_active)
     VALUES ($1, $2, $3, $4, $5::json, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       org_id = EXCLUDED.org_id,
       entity_id = EXCLUDED.entity_id,
       version_number = EXCLUDED.version_number,
       state = EXCLUDED.state,
       created_by_action_id = EXCLUDED.created_by_action_id,
       is_active = EXCLUDED.is_active`,
    [
      DEMO_IDS.entityVersionV4,
      DEMO_IDS.org,
      DEMO_IDS.entity,
      4,
      JSON.stringify(BASE_ENTITY_STATE),
      null,
      true,
    ],
  );
}

export async function seedDemoData(): Promise<void> {
  await writeTransaction(async (client) => {
    await upsertOrganization(client);
    await upsertUsers(client);
    await upsertAgent(client);
    await upsertPolicy(client);
    await upsertActionTypes(client);
    await upsertApprovalRules(client);
    await upsertBusinessEntity(client);
  });
}
