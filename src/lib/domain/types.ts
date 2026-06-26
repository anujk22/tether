export const ACTION_STATUSES = [
  "proposed",
  "gated",
  "approval_required",
  "approved",
  "rejected",
  "executed",
  "execution_failed",
  "rolled_back",
  "compensated",
] as const;

export const GATE_DECISIONS = [
  "auto_approve",
  "require_approval",
  "deny",
] as const;

export const USER_ROLES = [
  "support_lead",
  "finance",
  "csm",
  "admin",
] as const;

export const REVERSIBILITY_CLASSES = [
  "REVERSIBLE_INTERNAL",
  "IRREVERSIBLE_EXTERNAL",
] as const;

export const ACTION_TYPE_KEYS = ["issue_refund", "refund_reversal"] as const;

export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type GateDecision = (typeof GATE_DECISIONS)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type ReversibilityClass = (typeof REVERSIBILITY_CLASSES)[number];
export type ActionTypeKey = (typeof ACTION_TYPE_KEYS)[number];

export type EvidenceItem = {
  label: string;
  value: string;
  source: string;
};

export type GateResult = {
  decision: GateDecision;
  status: ActionStatus;
  requiredApproverRole: UserRole | null;
  matchedRuleId: string | null;
  policyTitle: string | null;
};

export type JsonRecord = Record<string, unknown>;
