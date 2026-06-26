import type { EvidenceItem, JsonRecord } from "../domain/types";
import { DEMO_IDS } from "./ids";

export const SCRIPTED_REFUND_IDEMPOTENCY_KEY =
  "demo-issue-refund-cust-8841-1250";

export const SCRIPTED_REFUND_CHANGES: JsonRecord = {
  refund_amount: 1250,
  refund_status: "pending_refund_1250",
  ticket_priority: "critical",
  customer_health: "at_risk",
  csm_notified: true,
};

export const SCRIPTED_REFUND_EVIDENCE: EvidenceItem[] = [
  {
    label: "Customer report",
    value: "Duplicate charge on annual enterprise plan renewal.",
    source: "support_ticket",
  },
  {
    label: "Payment signal",
    value: "$1,250 charge appears twice within the same billing window.",
    source: "simulated_payments",
  },
  {
    label: "Account tier",
    value: "Enterprise customer with renewal risk if unresolved.",
    source: "crm_snapshot",
  },
];

export function scriptedRefundProposal(idempotencyKey = SCRIPTED_REFUND_IDEMPOTENCY_KEY) {
  return {
    agent_id: DEMO_IDS.agent,
    entity_type: "customer",
    entity_id: DEMO_IDS.entity,
    action_type: "issue_refund",
    proposed_changes: SCRIPTED_REFUND_CHANGES,
    rationale:
      "The customer appears to have been charged twice for the same renewal. A refund should be issued, the ticket escalated, and the CSM notified because the account is enterprise-tier.",
    evidence: SCRIPTED_REFUND_EVIDENCE,
    risk_level: "HIGH",
    idempotency_key: idempotencyKey,
  };
}
