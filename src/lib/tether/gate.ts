import type { DbClient } from "../db/client";
import type {
  ActionStatus,
  GateDecision,
  GateResult,
  JsonRecord,
  UserRole,
} from "../domain/types";
import { asJsonRecord } from "./json";

type ApprovalRuleRow = {
  id: string;
  condition: unknown;
  decision: GateDecision;
  required_approver_role: UserRole | null;
  priority: number;
};

type PolicyRow = {
  title: string | null;
};

export type GateInput = {
  orgId: string;
  actionTypeKey: string;
  proposedChanges: JsonRecord;
  priorState: JsonRecord;
  riskLevel: string;
  client: DbClient;
};

type FieldSource = "proposed_changes" | "prior_state" | "root";

type SimpleCondition = {
  always?: boolean;
  all?: unknown[];
  field?: string;
  source?: FieldSource;
  op?: "eq" | "gt" | "gte" | "lt" | "lte" | "between";
  value?: unknown;
  min?: number;
  max?: number;
};

function statusForDecision(decision: GateDecision): ActionStatus {
  if (decision === "auto_approve") return "approved";
  if (decision === "require_approval") return "approval_required";
  return "rejected";
}

function getFieldValue(
  condition: SimpleCondition,
  input: Pick<GateInput, "proposedChanges" | "priorState" | "riskLevel">,
): unknown {
  if (condition.field === "risk_level") {
    return input.riskLevel;
  }

  const source = condition.source ?? "proposed_changes";
  const record = source === "prior_state" ? input.priorState : input.proposedChanges;

  if (!condition.field) {
    return undefined;
  }

  return record[condition.field];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function evaluateSimpleCondition(
  condition: SimpleCondition,
  input: Pick<GateInput, "proposedChanges" | "priorState" | "riskLevel">,
): boolean {
  if (condition.always === true) return true;

  if (Array.isArray(condition.all)) {
    return condition.all.every((child) =>
      evaluateCondition(asJsonRecord(child), input),
    );
  }

  const fieldValue = getFieldValue(condition, input);

  switch (condition.op) {
    case "eq":
      return fieldValue === condition.value;
    case "gt": {
      const numeric = toNumber(fieldValue);
      return numeric !== null && numeric > Number(condition.value);
    }
    case "gte": {
      const numeric = toNumber(fieldValue);
      return numeric !== null && numeric >= Number(condition.value);
    }
    case "lt": {
      const numeric = toNumber(fieldValue);
      return numeric !== null && numeric < Number(condition.value);
    }
    case "lte": {
      const numeric = toNumber(fieldValue);
      return numeric !== null && numeric <= Number(condition.value);
    }
    case "between": {
      const numeric = toNumber(fieldValue);
      return (
        numeric !== null &&
        numeric >= Number(condition.min) &&
        numeric <= Number(condition.max)
      );
    }
    default:
      return false;
  }
}

export function evaluateCondition(
  condition: JsonRecord,
  input: Pick<GateInput, "proposedChanges" | "priorState" | "riskLevel">,
): boolean {
  return evaluateSimpleCondition(condition as SimpleCondition, input);
}

export async function runGate(input: GateInput): Promise<GateResult> {
  const rules = await input.client.query<ApprovalRuleRow>(
    `SELECT id, condition, decision, required_approver_role, priority
     FROM approval_rules
     WHERE org_id = $1
       AND action_type_key = $2
     ORDER BY priority ASC`,
    [input.orgId, input.actionTypeKey],
  );

  const policy = await input.client.query<PolicyRow>(
    `SELECT title
     FROM company_policies
     WHERE org_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [input.orgId],
  );

  for (const rule of rules.rows) {
    const condition = asJsonRecord(rule.condition);

    if (
      evaluateCondition(condition, {
        proposedChanges: input.proposedChanges,
        priorState: input.priorState,
        riskLevel: input.riskLevel,
      })
    ) {
      return {
        decision: rule.decision,
        status: statusForDecision(rule.decision),
        requiredApproverRole: rule.required_approver_role,
        matchedRuleId: rule.id,
        policyTitle: policy.rows[0]?.title ?? null,
      };
    }
  }

  return {
    decision: "deny",
    status: "rejected",
    requiredApproverRole: null,
    matchedRuleId: null,
    policyTitle: policy.rows[0]?.title ?? null,
  };
}
