"use client";

import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Database,
  GitMerge,
  History,
  ListChecks,
  Network,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Split,
  Undo2,
  XCircle,
} from "lucide-react";

import {
  ConsoleSidebar,
  consoleViews,
  type ConsoleView,
} from "@/components/tether/console-sidebar";
import { scriptedRefundProposal } from "@/lib/demo/scripted-proposal";

type JsonRecord = Record<string, unknown>;
type StateToken =
  | "proposed"
  | "gated"
  | "approval"
  | "approved"
  | "executed"
  | "rejected"
  | "rolledback"
  | "compensated";

type ActionSummary = {
  id: string;
  agent_name: string;
  action_type_key: string;
  proposed_changes: JsonRecord;
  prior_state: JsonRecord;
  rationale: string;
  evidence: unknown[];
  risk_level: string;
  status: string;
  reversibility_class: string;
  idempotency_key: string;
  created_at: string;
  gate: JsonRecord;
};

type EntitySnapshot = {
  version_number: number;
  state: JsonRecord;
  external_ref: string;
};

type EntityVersion = {
  id: string;
  version_number: number;
  state: JsonRecord;
  is_active: boolean;
  created_by_action_id: string | null;
  created_at: string;
};

type TraceRow = {
  id: string;
  action_id: string | null;
  operation: string;
  table_name: string;
  summary: string;
  created_at: string;
};

type DashboardData = {
  actions: ActionSummary[];
  entity: EntitySnapshot;
  versions: EntityVersion[];
  traces: TraceRow[];
  auditEvents: AuditRow[];
};

type AuditRow = {
  id: string;
  action_id: string | null;
  event_type: string;
  payload: JsonRecord;
  created_at: string;
};

type PolicyRule = {
  id: string;
  action_type_key: string;
  condition: JsonRecord;
  decision: string;
  required_approver_role: string | null;
  priority: number;
  created_at: string;
};

type PoliciesData = {
  rules: PolicyRule[];
};

type InfrastructureData = {
  status: string;
  region: string;
  database: string;
  auth: string;
  consistency: string;
  isolation: string;
  checked_at: string;
  rowCounts: Array<{
    table_name: string;
    count: number;
  }>;
};

type RetryProof = {
  idempotency_key: string;
  attempts: Array<{
    attempt: number;
    action_id: string;
    status: string;
    deduped: boolean;
  }>;
  action_id: string;
  proposal_count: number;
  execution_count: number;
  status: string;
};

type MutationError = {
  source: string;
  message: string;
};

type ActingRole = "support_lead" | "finance" | "csm" | "admin";

type ComposerDraft = {
  actionType: "issue_refund" | "refund_reversal";
  refundAmount: string;
  customerTier: "enterprise" | "business" | "startup";
  customerHealth: "stable" | "at_risk";
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

const defaultDraft: ComposerDraft = {
  actionType: "issue_refund",
  refundAmount: "1250",
  customerTier: "enterprise",
  customerHealth: "at_risk",
  riskLevel: "HIGH",
};

const GUIDED_DEMO_KEY = "tetherdemo2026";
const GUIDED_STEP_MS = 6000;
const FINANCE_USER_ID = "00000000-0000-4000-8000-000000000102";
const SUPPORT_LEAD_USER_ID = "00000000-0000-4000-8000-000000000101";

const guidedSteps = [
  {
    eyebrow: "Cold open",
    title: "The disaster Tether prevents",
    caption:
      "An ungoverned AI agent issues a $1,250 refund. A retry bug fires it three times: $3,750 lost, no approval, no ledger, no undo.",
  },
  {
    eyebrow: "Proposal + gate",
    title: "Tether intercepts the write",
    caption:
      "The agent proposes the same $1,250 refund. Tether diffs v4, highlights the changed rows, and routes finance because amount > $500.",
  },
  {
    eyebrow: "Idempotency proof",
    title: "The triple-refund bug collapses to one",
    caption:
      "The cold-open retry bug runs for real: DSQL's unique index plus optimistic retries dedupe three attempts to exactly one proposal and one execution.",
  },
  {
    eyebrow: "Human approval",
    title: "Role enforcement, then finance approval",
    caption:
      "The finance-gated proposal is replayed from v4. A support lead approval is rejected by the API; finance approves, DSQL appends v5, and traces record the execution.",
  },
  {
    eyebrow: "Rollback + compensation",
    title: "Exact restore without erasing history",
    caption:
      "Rollback appends a restoring version; it does not overwrite history. Internal state returns to v4-equivalent values while the external payment reversal becomes a compensation action.",
  },
  {
    eyebrow: "The proof",
    title: "Live Aurora DSQL ledger",
    caption:
      "The proof view shows live row counts, IAM auth, region, and the lifecycle from Vercel route handlers to immutable Aurora DSQL tables.",
  },
] as const;

const actingRoles: ActingRole[] = ["support_lead", "finance", "csm", "admin"];

const lifecycle = [
  "proposed",
  "gated",
  "approval_required",
  "approved",
  "executed",
  "rolled_back",
  "compensated",
] as const;

const STATUS_TO_STATE: Record<string, StateToken> = {
  proposed: "proposed",
  gated: "gated",
  approval_required: "approval",
  approved: "approved",
  executed: "executed",
  rejected: "rejected",
  denied: "rejected",
  rolled_back: "rolledback",
  compensated: "compensated",
};

const stateLabels: Record<string, string> = {
  proposed: "Proposed",
  gated: "Gated",
  approval_required: "Approval required",
  approved: "Approved",
  executed: "Executed",
  rejected: "Rejected",
  denied: "Denied",
  rolled_back: "Rolled back",
  compensated: "Compensated",
};

const stateIcon: Record<string, typeof Clock3> = {
  proposed: Clock3,
  gated: ShieldCheck,
  approval_required: AlertTriangle,
  approved: CheckCircle2,
  executed: Database,
  rejected: XCircle,
  denied: XCircle,
  rolled_back: Undo2,
  compensated: GitMerge,
};

function stateStyle(status: string, treatment: "soft" | "token" = "soft"): CSSProperties {
  const token = STATUS_TO_STATE[status] ?? "proposed";
  const state = `var(--state-${token})`;
  const base = {
    "--state": state,
  } as CSSProperties;

  if (treatment === "token") return base;

  return {
    ...base,
    backgroundColor: `color-mix(in srgb, ${state} 14%, var(--bg-elevated))`,
    borderColor: `color-mix(in srgb, ${state} 40%, transparent)`,
    color: state,
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${url}`);
  }

  return body as T;
}

function shortId(id: string | null | undefined): string {
  if (!id) return "no-action";
  return id.slice(0, 8);
}

function money(value: unknown): string {
  if (typeof value !== "number") return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (value == null) return "none";
  return JSON.stringify(value);
}

function displayValue(value: unknown): string {
  return formatValue(value).replaceAll("_", " ");
}

function humanLabel(value: string | null | undefined): string {
  if (!value) return "None";

  const normalized = value.replaceAll("_", " ").trim().toLowerCase();
  const overrides: Record<string, string> = {
    csm: "CSM",
    high: "HIGH",
    low: "LOW",
    medium: "MEDIUM",
    none: "None",
  };

  if (overrides[normalized]) return overrides[normalized];

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatTime(value: string): string {
  const date = new Date(value);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  return `${h}:${m}:${s}.${ms}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function actionLabel(action: ActionSummary | undefined): string {
  if (!action) return "No action";

  return `${humanLabel(action.action_type_key)} · ${shortId(action.id)}`;
}

function jsonPreview(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function amountFromDraft(draft: ComposerDraft): number {
  const amount = Number(draft.refundAmount);

  if (!Number.isFinite(amount) || amount < 0) return 0;

  return Math.round(amount * 100) / 100;
}

function priorityForAmount(amount: number): string {
  if (amount > 500) return "critical";
  if (amount >= 100) return "elevated";
  return "normal";
}

function buildProposalFromDraft(draft: ComposerDraft) {
  const amount = amountFromDraft(draft);
  const isReversal = draft.actionType === "refund_reversal";
  const idempotencyKey = `console-${draft.actionType}-${Date.now()}`;
  const base = scriptedRefundProposal(idempotencyKey);
  const proposedChanges: JsonRecord = isReversal
    ? {
        refund_amount: amount,
        reversal_request_status: "queued",
        external_system: "simulated_payments",
        origin_action_id: "manual_console_request",
      }
    : {
        refund_amount: amount,
        refund_status: `pending_refund_${amount}`,
        ticket_priority: priorityForAmount(amount),
        customer_health: draft.customerHealth,
        csm_notified:
          draft.customerTier === "enterprise" && draft.customerHealth === "at_risk",
        tier: draft.customerTier,
      };

  return {
    ...base,
    action_type: draft.actionType,
    proposed_changes: proposedChanges,
    rationale: isReversal
      ? `Operator requested a simulated reversal for ${money(amount)} through the Tether console.`
      : `Operator proposed a ${money(amount)} refund for a ${draft.customerTier} customer. Tether should gate the write before customer state changes.`,
    evidence: [
      {
        label: "Console input",
        value: `${money(amount)} ${draft.actionType.replaceAll("_", " ")}`,
        source: "operator_console",
      },
      {
        label: "Customer tier",
        value: draft.customerTier,
        source: "operator_console",
      },
      {
        label: "Customer health",
        value: draft.customerHealth,
        source: "operator_console",
      },
    ],
    risk_level: draft.riskLevel,
    idempotency_key: idempotencyKey,
  };
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left === "object" || typeof right === "object") {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
}

function diffRows(action: ActionSummary) {
  const preferredKeys = [
    "refund_amount",
    "refund_status",
    "ticket_priority",
    "customer_health",
    "csm_notified",
    "tier",
  ];
  const keys = Array.from(
    new Set([
      ...preferredKeys,
      ...Object.keys(action.prior_state),
      ...Object.keys(action.proposed_changes),
    ]),
  );

  return keys
    .filter((key) => key in action.prior_state || key in action.proposed_changes)
    .map((key) => {
      const before = action.prior_state[key];
      const after =
        key in action.proposed_changes ? action.proposed_changes[key] : before;

      return {
        key,
        before,
        after,
        changed: !valuesEqual(before, after),
      };
    });
}

function statusIndex(status: string): number {
  if (status === "approval_required") return 2;
  const index = lifecycle.findIndex((item) => item === status);
  return index === -1 ? 0 : index;
}

function traceState(trace: TraceRow): string {
  if (trace.table_name === "approvals") return "approved";
  if (trace.table_name === "executions") return "executed";
  if (trace.table_name === "rollback_events") return "rolled_back";
  if (trace.table_name === "compensation_actions") return "compensated";
  if (trace.summary.includes("approval_required")) return "approval_required";
  if (trace.table_name === "action_proposals") return "proposed";
  return "gated";
}

function actionAmount(action: ActionSummary | null | undefined): number {
  const amount = action?.proposed_changes.refund_amount;

  return typeof amount === "number" ? amount : 0;
}

function roleFromGate(action: ActionSummary | null | undefined): string | null {
  const role = action?.gate.required_approver_role;

  return typeof role === "string" ? role : null;
}

function actionTier(action: ActionSummary | null | undefined): string {
  const tier =
    action?.proposed_changes.tier ??
    action?.proposed_changes.customer_tier ??
    action?.prior_state.tier ??
    "enterprise";

  return humanLabel(formatValue(tier));
}

function actionHealth(action: ActionSummary | null | undefined): string {
  const health =
    action?.proposed_changes.customer_health ??
    action?.prior_state.customer_health ??
    "stable";

  return humanLabel(formatValue(health));
}

function proposedActionCopy(action: ActionSummary | null | undefined): string {
  if (!action) return "No action selected";
  const actionName = humanLabel(action.action_type_key);
  const amount = actionAmount(action);

  return amount ? `${actionName} ${money(amount)}` : actionName;
}

function systemsForAction(action: ActionSummary | null | undefined): string {
  if (!action) return "Payment, Support, CRM";
  if (action.action_type_key === "refund_reversal") return "Payment";

  return "Payments, Support, CRM";
}

function gateDecision(action: ActionSummary | null | undefined): string {
  const decision = action?.gate.decision;

  return typeof decision === "string" ? decision : "pending";
}

function statusDisplay(action: ActionSummary): { status: string; label: string } {
  if (gateDecision(action) === "auto_approve" && action.status === "executed") {
    return { status: "approved", label: "Auto-approved" };
  }

  return {
    status: action.status,
    label: stateLabels[action.status] ?? humanLabel(action.status),
  };
}

function sortQueueActions(actions: ActionSummary[], selectedId: string | null) {
  const riskRank: Record<string, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };

  return [...actions].sort((left, right) => {
    if (left.id === selectedId) return -1;
    if (right.id === selectedId) return 1;

    return (
      (riskRank[left.risk_level] ?? 3) - (riskRank[right.risk_level] ?? 3) ||
      actionAmount(right) - actionAmount(left) ||
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  });
}

function roleIsAuthorized(action: ActionSummary | null, role: ActingRole): boolean {
  const requiredRole = roleFromGate(action);

  return !requiredRole || requiredRole === role;
}

function roleLabel(role: string | null | undefined): string {
  return humanLabel(role);
}

function viewFromSearchParam(value: string | null): ConsoleView {
  return consoleViews.find((view) => view.key === value)?.key ?? "cockpit";
}

function StatusPill({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const Icon = stateIcon[status] ?? Clock3;

  return (
    <span className="status-pill" style={stateStyle(status)}>
      <Icon aria-hidden="true" size={14} />
      {label ?? stateLabels[status] ?? status}
    </span>
  );
}

function PanelTitle({
  icon: Icon,
  title,
  aside,
}: {
  icon: typeof Clock3;
  title: string;
  aside?: string;
}) {
  return (
    <div className="panel-title">
      <div>
        <Icon aria-hidden="true" size={16} />
        <h2>{title}</h2>
      </div>
      {aside ? <span>{aside}</span> : null}
    </div>
  );
}

function MissionStrip({
  activeView,
  data,
  selectedAction,
  actingRole,
  onRoleChange,
}: {
  activeView: ConsoleView;
  data: DashboardData | undefined;
  selectedAction: ActionSummary | null;
  actingRole: ActingRole;
  onRoleChange: (role: ActingRole) => void;
}) {
  const approvalsRequired =
    data?.actions.filter((action) => action.status === "approval_required").length ?? 0;
  const activeVersion = data?.entity.version_number ?? "-";
  const selectedAmount = actionAmount(selectedAction);
  const title = consoleViews.find((view) => view.key === activeView)?.label ?? "Action Cockpit";
  const subtitle =
    activeView === "cockpit"
      ? "Governed write path for AI agents acting across support, payments, and CRM."
      : "Real Aurora DSQL state behind the governed write path.";
  const kpis = [
    {
      value: data?.actions.length ?? 0,
      label: "governed actions",
      tone: "neutral",
    },
    {
      value: money(selectedAmount),
      label: "amount at risk",
      tone: "approval",
    },
    {
      value: approvalsRequired,
      label: "approvals required",
      tone: "approval",
    },
    {
      value: data?.traces.length ?? 0,
      label: "DSQL traces",
      tone: "neutral",
    },
    {
      value: `v${activeVersion}`,
      label: "active state",
      tone: "approved",
    },
  ];

  return (
    <header className="console-header">
      <div className="mission-copyblock">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-metrics" aria-label="Console controls">
        <label className="role-selector">
          <span>Acting as</span>
          <select
            value={actingRole}
            onChange={(event) => onRoleChange(event.currentTarget.value as ActingRole)}
          >
            {actingRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="reality-strip" aria-label="Demo truth boundary">
        <span>
          <strong>Real</strong> policy gate, approvals, versioning, rollback,
          idempotency, and Aurora DSQL writes.
        </span>
        <span>
          <strong>Simulated</strong> AI agent, payment processor, support, and CRM
          side effects.
        </span>
      </div>
      <div className="mission-kpis" aria-label="Console metrics">
        {kpis.map((kpi) => (
          <div className="mission-kpi" data-tone={kpi.tone} key={kpi.label}>
            <strong>{kpi.value}</strong>
            <span>{kpi.label}</span>
          </div>
        ))}
      </div>
    </header>
  );
}

function AgentIntake({
  actions,
  selectedId,
  onSelect,
  onPropose,
  onReset,
  proposing,
  resetting,
}: {
  actions: ActionSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPropose: (draft: ComposerDraft) => void;
  onReset: () => void;
  proposing: boolean;
  resetting: boolean;
}) {
  const [draft, setDraft] = useState<ComposerDraft>(defaultDraft);
  const queueActions = sortQueueActions(actions, selectedId);

  function updateDraft<K extends keyof ComposerDraft>(
    key: K,
    value: ComposerDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPropose(draft);
  }

  return (
    <section className="console-panel intake-panel" aria-labelledby="agent-intake">
      <PanelTitle icon={Split} title="Agent Intake" aside="operational queue" />
      <form className="action-composer" onSubmit={submitAction}>
        <div className="composer-heading">
          <span>New governed action</span>
          <button
            disabled={proposing || resetting}
            onClick={() => {
              setDraft(defaultDraft);
            }}
            type="button"
          >
            Use $1,250 preset
          </button>
        </div>
        <label>
          <span>Action type</span>
          <select
            value={draft.actionType}
            onChange={(event) =>
              updateDraft(
                "actionType",
                event.currentTarget.value as ComposerDraft["actionType"],
              )
            }
          >
            <option value="issue_refund">Issue refund</option>
            <option value="refund_reversal">Request refund reversal</option>
          </select>
        </label>
        <div className="composer-row">
          <label>
            <span>Refund amount (USD)</span>
            <input
              min="0"
              step="1"
              type="number"
              value={draft.refundAmount}
              onChange={(event) => updateDraft("refundAmount", event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Risk</span>
            <select
              value={draft.riskLevel}
              onChange={(event) =>
                updateDraft(
                  "riskLevel",
                  event.currentTarget.value as ComposerDraft["riskLevel"],
                )
              }
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </label>
        </div>
        <div className="composer-row">
          <label>
            <span>Customer tier</span>
            <select
              value={draft.customerTier}
              onChange={(event) =>
                updateDraft(
                  "customerTier",
                  event.currentTarget.value as ComposerDraft["customerTier"],
                )
              }
            >
              <option value="enterprise">Enterprise</option>
              <option value="business">Business</option>
              <option value="startup">Startup</option>
            </select>
          </label>
          <label>
            <span>Health</span>
            <select
              value={draft.customerHealth}
              onChange={(event) =>
                updateDraft(
                  "customerHealth",
                  event.currentTarget.value as ComposerDraft["customerHealth"],
                )
              }
            >
              <option value="stable">Stable</option>
              <option value="at_risk">At risk</option>
            </select>
          </label>
        </div>
        <button
          className="primary-control composer-submit"
          disabled={proposing || resetting}
          style={stateStyle("executed", "token")}
          type="submit"
        >
          <CircleDollarSign aria-hidden="true" size={16} />
          {proposing ? "Proposing action" : "Submit real proposal"}
        </button>
      </form>
      <div className="action-list" aria-labelledby="agent-intake">
        {queueActions.length ? (
          queueActions.map((action) => {
            const display = statusDisplay(action);

            return (
              <button
                aria-pressed={selectedId === action.id}
                className="action-card"
                data-risk={action.risk_level.toLowerCase()}
                data-selected={selectedId === action.id}
                key={action.id}
                onClick={() => onSelect(action.id)}
                type="button"
              >
                <span className="action-card-top">
                  <span className="agent-identity">
                    <Image
                      alt=""
                      height={587}
                      src="/tether-assets/AstronautForwardMiniIconTiny.png"
                      width={507}
                    />
                    <span>
                      <strong>{action.agent_name}</strong>
                      <em>{humanLabel(action.action_type_key)}</em>
                    </span>
                  </span>
                  <StatusPill status={display.status} label={display.label} />
                </span>
                <span className="action-card-main">
                  <strong>
                    <span>$</span>
                    {money(actionAmount(action)).replace("$", "")}
                  </strong>
                  <span>
                    {actionTier(action)}
                    <em>{actionHealth(action)}</em>
                  </span>
                </span>
                <span className="action-card-meta">
                  <span>{action.risk_level}</span>
                  <code>ID: {shortId(action.id)}</code>
                </span>
              </button>
            );
          })
        ) : (
          <div className="empty-state">Queue clear — propose an action to begin.</div>
        )}
      </div>
      <a className="view-all-link" href="#flight-recorder">
        View all proposals <ArrowRight aria-hidden="true" size={14} />
      </a>
      <div className="intake-controls">
        <button
          className="secondary-control"
          disabled={resetting}
          onClick={onReset}
          type="button"
        >
          <RefreshCcw aria-hidden="true" size={16} />
          {resetting ? "Resetting demo" : "Reset demo"}
        </button>
      </div>
    </section>
  );
}

function PolicyGate({
  action,
  entity,
  versions,
}: {
  action: ActionSummary | null;
  entity: EntitySnapshot | null;
  versions: EntityVersion[];
}) {
  const reducedMotion = useReducedMotion();
  const currentIndex = statusIndex(action?.status ?? "proposed");
  const rows = action ? diffRows(action) : [];
  const activeVersion = versions.find((version) => version.is_active);
  const isRollback = action?.status === "rolled_back" || action?.status === "compensated";
  const requiredRole = roleFromGate(action);
  const amount = actionAmount(action);
  const reasonChips = action
    ? [
        amount > 500
          ? "Refund amount exceeds auto-approval threshold"
          : "Refund amount fits policy threshold",
        `Customer tier: ${actionTier(action)}`,
        `Customer health: ${actionHealth(action)}`,
        action.reversibility_class === "IRREVERSIBLE_EXTERNAL"
          ? "External financial action requires compensation path"
          : "Internal state can be restored exactly",
        "Agent has no direct write access",
      ]
    : [];
  const summaryItems = [
    ["Proposed action", proposedActionCopy(action)],
    ["Agent", action?.agent_name ?? "No agent"],
    ["Customer", String(action?.prior_state.customer_id ?? entity?.external_ref ?? "-")],
    ["Systems affected", systemsForAction(action)],
    ["Risk", action?.risk_level ?? "-"],
    ["Current status", action ? stateLabels[action.status] ?? action.status : "-"],
    ["Required approver", roleLabel(requiredRole)],
    ["Active version", `v${activeVersion?.version_number ?? entity?.version_number ?? "-"}`],
  ];
  const routeItems = [
    ["Policy route", String(action?.gate.policy_title ?? "Refund authority")],
    ["Required role", roleLabel(requiredRole)],
    ["Decision mode", humanLabel(gateDecision(action))],
    [
      "Reversibility",
      action?.reversibility_class === "IRREVERSIBLE_EXTERNAL"
        ? "Compensation required"
        : "Exact rollback available",
    ],
  ];

  return (
    <section
      className="console-panel gate-panel"
      aria-labelledby="policy-gate"
      data-rollback={isRollback}
    >
      <PanelTitle
        icon={ShieldCheck}
        title="Policy Gate"
        aside={entity ? entity.external_ref : "loading"}
      />
      <div className="ledger-rail" aria-label="Action state machine">
        {lifecycle.map((status, index) => {
          const phase =
            index < currentIndex ? "complete" : index === currentIndex ? "active" : "pending";
          const Icon = stateIcon[status] ?? Clock3;

          return (
            <div
              className="rail-step"
              data-phase={phase}
              key={status}
              style={stateStyle(status, "token")}
            >
              <motion.span
                animate={
                  reducedMotion || phase !== "active"
                    ? undefined
                    : {
                        scale: [1, status === "approval_required" ? 1.12 : 1.04, 1],
                      }
                }
                transition={{
                  duration: status === "approval_required" ? 0.28 : 2,
                  repeat: status === "approval_required" ? 0 : Infinity,
                  ease: "easeInOut",
                }}
                className="rail-node"
              >
                {phase === "complete" ? (
                  <Check aria-hidden="true" size={15} />
                ) : (
                  <Icon aria-hidden="true" size={15} />
                )}
              </motion.span>
              <span className="rail-label">{stateLabels[status]}</span>
              {index < lifecycle.length - 1 ? (
                <span className="rail-connector" aria-hidden="true" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="gate-section action-summary-section">
        <h3>Action summary</h3>
        <div className="summary-grid">
          {summaryItems.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
      <motion.div
        className="gate-section"
        animate={
          !reducedMotion && action?.status === "approval_required"
            ? { borderColor: ["var(--state-approval)", "var(--border-subtle)"] }
            : undefined
        }
        transition={{ duration: 0.7 }}
      >
        <h3>Why Tether gated this</h3>
        <div className="evidence-chip-grid">
          {reasonChips.map((reason) => (
            <span key={reason}>
              <i aria-hidden="true" />
              {reason}
            </span>
          ))}
        </div>
      </motion.div>
      <div className="gate-section route-section">
        <h3>Policy route</h3>
        <div className="policy-route-grid">
          {routeItems.map(([label, value]) => (
            <div className={label === "Active version" ? "version-card" : ""} key={label}>
              <span>{label}</span>
              <strong>
                {value}
                {label === "Active version" && isRollback ? <em> restoring v4</em> : null}
              </strong>
            </div>
          ))}
        </div>
      </div>
      <div className="gate-section diff-section">
        <div className="section-heading-row">
          <h3>State diff</h3>
          <span>immutable proposal snapshot</span>
        </div>
        <div className="diff-table" aria-label="Before and after state diff">
          <div className="diff-row diff-head" aria-hidden="true">
            <code>Field</code>
            <span>Before snapshot</span>
            <span />
            <strong>Proposed change</strong>
          </div>
          {action ? (
            rows.map((row) => (
              <motion.div
                className="diff-row"
                data-changed={row.changed}
                key={row.key}
                layout
                style={stateStyle(action.status, "token")}
              >
                <code>{row.key}</code>
                <span>{displayValue(row.before)}</span>
                <span aria-hidden="true">→</span>
                <strong>{displayValue(row.after)}</strong>
              </motion.div>
            ))
          ) : (
            <div className="empty-state">No action selected.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function DecisionPanel({
  action,
  actingRole,
  onApprove,
  onRollback,
  onRetry,
  approving,
  rollingBack,
  retrying,
  retryProof,
}: {
  action: ActionSummary | null;
  actingRole: ActingRole;
  onApprove: () => void;
  onRollback: () => void;
  onRetry: () => void;
  approving: boolean;
  rollingBack: boolean;
  retrying: boolean;
  retryProof: RetryProof | null;
}) {
  const requiredRole = roleFromGate(action);
  const isAuthorized = roleIsAuthorized(action, actingRole);
  const canApprove = action?.status === "approval_required" && isAuthorized;
  const canRollback = action?.status === "executed";
  const enforcementLabel = isAuthorized ? "Authorized" : "Blocked";
  const approvedSteps = [
    "Record approval in Aurora DSQL",
    "Append immutable trace",
    "Create new entity version",
    "Mark refund as pending",
    "Preserve rollback path",
  ];
  const rollbackSteps = [
    "Restore internal state from proposal snapshot",
    "Append rollback version",
    "Create compensation action for external reversal",
    "Route compensation through policy gate",
  ];
  const contextRows = action
    ? [
        ["Console input", proposedActionCopy(action)],
        ["Customer tier", actionTier(action)],
        ["Customer health", actionHealth(action)],
        [
          "Reversibility",
          action.reversibility_class === "IRREVERSIBLE_EXTERNAL"
            ? "Compensation required"
            : "Exact rollback available",
        ],
      ]
    : [];

  return (
    <section className="console-panel decision-panel" aria-labelledby="decision">
      <PanelTitle icon={CheckCircle2} title="Decision" aside={action ? shortId(action.id) : ""} />
      {action ? (
        <>
          <div
            className="decision-banner"
            data-status={action.status}
            style={stateStyle(action.status, "token")}
          >
            <StatusPill status={action.status} />
            <strong>
              {action.status === "approval_required"
                ? "Approval required"
                : stateLabels[action.status] ?? action.status}
            </strong>
            <p>
              {action.status === "approval_required"
                ? `${roleLabel(requiredRole)} approval required before this agent can issue a ${money(
                    actionAmount(action),
                  )} refund.`
                : action.rationale}
            </p>
          </div>
          <div className="decision-role-grid">
            <div>
              <span>Acting as</span>
              <strong>{roleLabel(actingRole)}</strong>
            </div>
            <div>
              <span>Decision role</span>
              <strong>{roleLabel(requiredRole)}</strong>
            </div>
            <div>
              <span>Enforcement status</span>
              <strong data-authorized={isAuthorized}>
                {enforcementLabel}
                {isAuthorized ? " ✓" : ""}
              </strong>
            </div>
          </div>
          {!isAuthorized && action.status === "approval_required" ? (
            <div className="decision-block-note" role="status">
              Switch acting role to {roleLabel(requiredRole)} to approve this action.
            </div>
          ) : null}
          <div className="decision-outcome-card" data-kind="approved">
            <h3>What happens if approved</h3>
            <ul>
              {approvedSteps.map((step) => (
                <li key={step}>
                  <Check aria-hidden="true" size={14} />
                  {step}
                </li>
              ))}
            </ul>
            <Image
              alt=""
              height={587}
              priority
              src="/tether-assets/AstroMiniCheck.png"
              width={507}
            />
          </div>
          <div className="decision-outcome-card" data-kind="rollback">
            <h3>What happens if rolled back</h3>
            <ul>
              {rollbackSteps.map((step) => (
                <li key={step}>
                  <Check aria-hidden="true" size={14} />
                  {step}
                </li>
              ))}
            </ul>
            <Image
              alt=""
              height={720}
              priority
              src="/tether-assets/AstroMiniRollback.png"
              width={835}
            />
          </div>
          <div className="decision-context-table">
            {contextRows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <code>{value}</code>
              </div>
            ))}
          </div>
          <div className="decision-controls">
            <button
              className="primary-control"
              disabled={!canApprove || approving}
              onClick={onApprove}
              style={stateStyle("approved", "token")}
              type="button"
            >
              <CheckCircle2 aria-hidden="true" size={16} />
              {approving ? "Approving refund" : "Approve refund"}
            </button>
            <button
              className="primary-control"
              disabled={!canRollback || rollingBack}
              onClick={onRollback}
              style={stateStyle("rolled_back", "token")}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} />
              {rollingBack ? "Rolling back action" : "Rollback action"}
            </button>
          </div>
        </>
      ) : (
        <div className="empty-state">Select an action.</div>
      )}
      <div className="retry-proof">
        <button
          className="secondary-control retry-button"
          disabled={retrying}
          onClick={onRetry}
          type="button"
        >
          <GitMerge aria-hidden="true" size={16} />
          {retrying ? "Merging attempts" : "Simulate retry x3"}
        </button>
        <div className="retry-attempts" data-merged={Boolean(retryProof)}>
          {(retryProof?.attempts ?? [1, 2, 3].map((attempt) => ({ attempt }))).map(
            (attempt) => (
              <motion.span
                className="retry-chip"
                data-deduped={"deduped" in attempt ? attempt.deduped : false}
                key={attempt.attempt}
                layout
              >
                {attempt.attempt}
              </motion.span>
            ),
          )}
          <code>
            {retryProof
              ? `${retryProof.proposal_count} proposal · ${retryProof.execution_count} execution · 0 double refunds`
              : "1 of 3 proposals survives"}
          </code>
        </div>
      </div>
    </section>
  );
}

function FlightRecorder({ traces }: { traces: TraceRow[] }) {
  const newest = useMemo(
    () =>
      [...traces]
        .sort(
          (left, right) =>
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
        )
        .slice(0, 30),
    [traces],
  );
  const recorderChips = [
    "Aurora DSQL ledger",
    `${traces.length} traces`,
    "append-only",
    "IAM-authenticated",
    "us-east-1",
    "retry-safe",
  ];

  return (
    <section
      className="console-panel recorder-panel"
      id="flight-recorder"
      aria-label="DSQL Flight Recorder"
    >
      <div className="recorder-title">
        <PanelTitle icon={Database} title="DSQL Flight Recorder" aside="operation_traces" />
        <span className="rec-light">REC</span>
      </div>
      <div className="recorder-chips" aria-label="DSQL recorder attributes">
        {recorderChips.map((chip) => (
          <span key={chip}>{chip}</span>
        ))}
      </div>
      <div className="trace-stream" aria-live="polite">
        <AnimatePresence initial={false}>
          {newest.length ? (
            newest.map((trace) => (
              <motion.div
                className="trace-row"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                key={trace.id}
                style={stateStyle(traceState(trace), "token")}
              >
                <time>{formatTime(trace.created_at)}</time>
                <span>{trace.operation}</span>
                <code>{trace.table_name}</code>
                <p>{trace.summary}</p>
                <code>{shortId(trace.action_id)}</code>
              </motion.div>
            ))
          ) : (
            <div className="empty-state">No trace rows yet.</div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="console-shell">
      <div className="loading-band" />
      <div className="loading-grid">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function LedgerView({
  versions,
  actions,
}: {
  versions: EntityVersion[];
  actions: ActionSummary[];
}) {
  const actionById = new Map(actions.map((action) => [action.id, action]));

  return (
    <section className="console-panel view-panel ledger-view">
      <PanelTitle icon={History} title="Ledger / Version History" aside="entity_versions" />
      <div className="version-timeline">
        {[...versions].reverse().map((version) => {
          const creator = version.created_by_action_id
            ? actionById.get(version.created_by_action_id)
            : undefined;

          return (
            <article data-active={version.is_active} key={version.id}>
              <div className="version-head">
                <span>v{version.version_number}</span>
                <strong>{version.is_active ? "active pointer" : "append-only"}</strong>
                <code>{shortId(version.id)}</code>
              </div>
              <div className="version-meta">
                <span>created {formatDateTime(version.created_at)}</span>
                <span>by {actionLabel(creator)}</span>
              </div>
              <pre>{jsonPreview(version.state)}</pre>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AuditTrailView({
  auditEvents,
  actions,
}: {
  auditEvents: AuditRow[];
  actions: ActionSummary[];
}) {
  const [filterActionId, setFilterActionId] = useState("all");
  const actionById = new Map(actions.map((action) => [action.id, action]));
  const filtered =
    filterActionId === "all"
      ? auditEvents
      : auditEvents.filter((event) => event.action_id === filterActionId);

  return (
    <section className="console-panel view-panel audit-view">
      <PanelTitle icon={ListChecks} title="Audit Trail" aside="audit_events" />
      <label className="view-filter">
        <span>Filter by action</span>
        <select
          value={filterActionId}
          onChange={(event) => setFilterActionId(event.currentTarget.value)}
        >
          <option value="all">All actions</option>
          {actions.map((action) => (
            <option key={action.id} value={action.id}>
              {actionLabel(action)}
            </option>
          ))}
        </select>
      </label>
      <div className="audit-list-view">
        {filtered.map((event) => {
          const action = event.action_id ? actionById.get(event.action_id) : undefined;

          return (
            <article key={event.id}>
              <time>{formatDateTime(event.created_at)}</time>
              <strong>{humanLabel(event.event_type)}</strong>
              <span>{actionLabel(action)}</span>
              <pre>{jsonPreview(event.payload)}</pre>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PoliciesView({
  policies,
}: {
  policies: PoliciesData | undefined;
}) {
  const rules = policies?.rules ?? [];

  return (
    <section className="console-panel view-panel policies-view">
      <PanelTitle icon={BookOpen} title="Policies" aside="approval_rules" />
      <div className="policy-rule-grid">
        {rules.map((rule) => (
          <article key={rule.id}>
            <div>
              <span>Priority {rule.priority}</span>
              <StatusPill
                status={
                  rule.decision === "auto_approve"
                    ? "approved"
                    : rule.decision === "deny"
                      ? "rejected"
                      : "approval_required"
                }
              />
            </div>
            <h3>{humanLabel(rule.action_type_key)}</h3>
            <dl>
              <div>
                <dt>Decision</dt>
                <dd>{humanLabel(rule.decision)}</dd>
              </div>
              <div>
                <dt>Required role</dt>
                <dd>{roleLabel(rule.required_approver_role)}</dd>
              </div>
            </dl>
            <pre>{jsonPreview(rule.condition)}</pre>
          </article>
        ))}
      </div>
    </section>
  );
}

function traceGroups(traces: TraceRow[]) {
  const groups = new Map<string, TraceRow[]>();

  for (const trace of traces) {
    const key = trace.action_id ?? "foundation";
    groups.set(key, [...(groups.get(key) ?? []), trace]);
  }

  return Array.from(groups.entries())
    .map(([actionId, rows]) => ({
      actionId,
      rows,
      last: rows[rows.length - 1],
    }))
    .sort((left, right) => {
      const leftTime = new Date(left.last?.created_at ?? 0).getTime();
      const rightTime = new Date(right.last?.created_at ?? 0).getTime();

      return rightTime - leftTime;
    });
}

function InfrastructureView({
  infrastructure,
  traces,
  retryProof,
  retrying,
  onRetry,
}: {
  infrastructure: InfrastructureData | undefined;
  traces: TraceRow[];
  retryProof: RetryProof | null;
  retrying: boolean;
  onRetry: () => void;
}) {
  const proofFlow = [
    "Vercel",
    "Next.js route handlers",
    "Aurora DSQL",
    "action_proposals",
    "approvals",
    "entity_versions",
    "operation_traces",
    "audit_events",
  ];

  return (
    <section className="console-panel view-panel infrastructure-view">
      <PanelTitle icon={Network} title="Infrastructure / Aurora DSQL" aside="live proof" />
      <div className="infra-status-line">
        Live connection · Aurora DSQL · {infrastructure?.region ?? "us-east-1"} ·{" "}
        {infrastructure?.auth ?? "IAM token auth"} ·{" "}
        {infrastructure?.consistency ?? "strong consistency"} ·{" "}
        {infrastructure?.isolation ?? "snapshot isolation"} · Vercel serverless
      </div>
      <div className="infra-value-card">
        <strong>Why Aurora DSQL matters</strong>
        <p>
          Tether guarantees exactly-once execution and exact rollback because every
          action is an immutable, versioned transaction in Aurora DSQL: strong
          consistency plus a unique idempotency key. Without a strongly-consistent
          ledger, you cannot promise finance a refund will not fire twice.
        </p>
      </div>
      <div className="infra-flow" aria-label="Production data path">
        {proofFlow.map((step, index) => (
          <span key={step}>
            <code>{step}</code>
            {index < proofFlow.length - 1 ? <ArrowRight aria-hidden="true" size={13} /> : null}
          </span>
        ))}
      </div>
      <div className="infra-grid">
        <article>
          <span>Connection</span>
          <strong>{infrastructure?.status ?? "checking"}</strong>
          <code>{infrastructure?.database ?? "postgres"}</code>
        </article>
        <article>
          <span>Checked at</span>
          <strong>{infrastructure ? formatDateTime(infrastructure.checked_at) : "pending"}</strong>
          <code>SELECT now()</code>
        </article>
        <article>
          <span>Retry proof</span>
          <strong>
            {retryProof
              ? `${retryProof.proposal_count} proposal · ${retryProof.execution_count} execution`
              : "ready"}
          </strong>
          <code>23505 dedupe · 40001 retry</code>
        </article>
      </div>
      <div className="infra-proof">
        <button
          className="primary-control"
          disabled={retrying}
          onClick={onRetry}
          style={stateStyle("executed", "token")}
          type="button"
        >
          <GitMerge aria-hidden="true" size={16} />
          {retrying ? "Running retry proof" : "Fire retry x3"}
        </button>
        <p>
          Three concurrent proposals share one idempotency key. DSQL unique
          index handling plus optimistic retries collapses them to one proposal
          and one execution.
        </p>
      </div>
      <div className="section-heading-row infra-subheading">
        <h3>Live table row counts</h3>
        <span>queried from Aurora DSQL</span>
      </div>
      <div className="row-count-grid">
        {(infrastructure?.rowCounts ?? []).map((row) => (
          <span key={row.table_name}>
            <code>{row.table_name}</code>
            <strong>{row.count}</strong>
          </span>
        ))}
      </div>
      <div className="transaction-groups">
        {traceGroups(traces).slice(0, 8).map((group) => (
          <article key={group.actionId}>
            <strong>{shortId(group.actionId)}</strong>
            <span>{group.rows.length} writes · 1 txn · retry-safe</span>
            <code>{group.last?.summary ?? "No trace summary"}</code>
          </article>
        ))}
      </div>
    </section>
  );
}

function TetherLogoIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      style={{ width: size, height: (size * 80) / 100 }}
      viewBox="0 0 100 80"
      aria-hidden="true"
    >
      <path d="M 48 80 L 48 16 C 48 6, 42 0, 32 0 L 10 0 C 2 0, 2 18, 10 18 L 26 18 C 36 18, 40 22, 40 32 L 40 70 L 48 80 Z" fill="currentColor" />
      <path d="M 52 80 L 52 16 C 52 6, 58 0, 68 0 L 90 0 C 98 0, 98 18, 90 18 L 74 18 C 64 18, 60 22, 60 32 L 60 70 L 52 80 Z" fill="currentColor" />
    </svg>
  );
}

function GuidedColdOpen({
  onNext,
  onRestart,
  running,
}: {
  onNext: () => void;
  onRestart: () => void;
  running: boolean;
}) {
  const [visibleLogCount, setVisibleLogCount] = useState(0);
  const [leakAmount, setLeakAmount] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setVisibleLogCount(1);
      setLeakAmount(1250);
    }, 600);

    const t2 = setTimeout(() => {
      setVisibleLogCount(2);
      setLeakAmount(2500);
    }, 1600);

    const t3 = setTimeout(() => {
      setVisibleLogCount(3);
      setLeakAmount(3750);
    }, 2700);

    const t4 = setTimeout(() => {
      setLocked(true);
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div className="guided-disaster-redesign" aria-label="Cold open disaster scenario">
      {/* Visual Space Branding Background */}
      <div className="space-branding-bg" aria-hidden="true">
        <Image
          src="/tether-assets/minimoon.png"
          alt=""
          width={120}
          height={120}
          className="brand-moon-decor"
        />
        <Image
          src="/tether-assets/minisatellite.png"
          alt=""
          width={90}
          height={90}
          className="brand-satellite-decor"
        />
      </div>

      <div className="guided-disaster-grid">
        {/* Left Column: Narrative with Astronaut */}
        <div className="disaster-col-narrative">
          <div className="narrative-content">
            <span className="disaster-alert-tag">INCIDENT REPORT · HIGH RISK</span>
            <h2>
              <span>1 retry bug.</span>
              <span>3 refunds sent.</span>
              <strong className="text-leak">${leakAmount.toLocaleString()} lost.</strong>
            </h2>
            <p>
              An AI agent attempts to issue a single $1,250 refund. A network retry loop fires the API call three times. Without Tether&apos;s governed write path, the transaction is executed repeatedly.
            </p>
            <div className="disaster-prevent-footer">
              <span className="bullet">→</span>
              <span>This is the disaster Tether prevents.</span>
            </div>
          </div>
          
          {/* Astronaut Illustration Card */}
          <div className="disaster-astro-card">
            <Image
              src="/tether-assets/AstronautForwardMiniIconTiny.png"
              alt="Astronaut"
              width={38}
              height={44}
              className="astro-img"
              priority
            />
            <div className="astro-card-caption">
              <span>UNGOVERNED AGENT WRITING DIRECTLY TO PAYMENTS</span>
              <small>System identity: UNMONITORED</small>
            </div>
          </div>
        </div>

        {/* Center Column: API Terminal & Topology */}
        <div className="disaster-col-center">
          {/* Terminal */}
          <div className="disaster-terminal-card">
            <div className="terminal-header">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="terminal-title">API LOGS · DOWNSTREAM PAYMENT SYSTEM</span>
            </div>
            <div className="terminal-body">
              {visibleLogCount >= 1 && (
                <div className="terminal-row">
                  <div className="terminal-row-left">
                    <span className="time">15:04:11.002</span>
                    <span className="method">POST</span>
                    <span className="path">/payments/refund</span>
                    <span className="amount">$1,250</span>
                    <span className="status-code">200 OK</span>
                  </div>
                  <span className="tag-no-gate">NO GATE</span>
                </div>
              )}
              {visibleLogCount >= 2 && (
                <div className="terminal-row">
                  <div className="terminal-row-left">
                    <span className="time">15:04:12.140</span>
                    <span className="method">POST</span>
                    <span className="path">/payments/refund</span>
                    <span className="amount">$1,250</span>
                    <span className="status-code">200 OK</span>
                  </div>
                  <span className="tag-no-gate">NO IDEMPOTENCY</span>
                </div>
              )}
              {visibleLogCount >= 3 && (
                <div className="terminal-row">
                  <div className="terminal-row-left">
                    <span className="time">15:04:13.250</span>
                    <span className="method">POST</span>
                    <span className="path">/payments/refund</span>
                    <span className="amount">$1,250</span>
                    <span className="status-code">200 OK</span>
                  </div>
                  <span className="tag-no-gate">NO ROLLBACK</span>
                </div>
              )}
            </div>
          </div>

          {/* Topology Diagram */}
          <div className="disaster-topology-card">
            <div className="topology-title">SYSTEM TOPOLOGY · UNGOVERNED PATH</div>
            <div className="topology-container">
              <div className="topology-row">
                <div className="topology-node-new" data-status="active">
                  <div className="node-icon-wrapper">
                    <Bot size={14} className="node-icon" />
                  </div>
                  <div className="node-text">
                    <div className="node-title">AI AGENT</div>
                    <div className="node-subtitle">Support Agent</div>
                  </div>
                </div>
                <div className="topology-arrow-new" data-style="solid" />
                <div className="topology-node-new" data-status="unsafe">
                  <div className="node-icon-wrapper">
                    <AlertTriangle size={14} className="node-icon" />
                  </div>
                  <div className="node-text">
                    <div className="node-title">RAW API WRITE</div>
                    <div className="node-subtitle">Direct Endpoint</div>
                  </div>
                </div>
                <div className="topology-arrow-new" data-style="dashed" />
                <div className="topology-node-new" data-status="unsafe">
                  <div className="node-icon-wrapper">
                    <CircleDollarSign size={14} className="node-icon" />
                  </div>
                  <div className="node-text">
                    <div className="node-title">PAYMENT SYSTEM</div>
                    <div className="node-subtitle">Downstream</div>
                  </div>
                </div>
              </div>

              {/* Custom dotted tree connector */}
              <div className="topology-tree-connector">
                <div className="tree-line tree-line-left-vertical" />
                <div className="tree-line tree-line-right-vertical" />
                <div className="tree-line tree-line-center-vertical-top" />
                <div className="tree-line tree-line-horizontal" />
                <div className="tree-bypassed-badge">
                  <span className="bypassed-x">×</span>
                </div>
                <div className="tree-line tree-line-center-vertical-bottom" />
              </div>

              <div className="topology-row" style={{ justifyContent: "center" }}>
                <div className="topology-node-new" data-status="bypassed">
                  <div className="node-icon-wrapper">
                    <TetherLogoIcon size={14} />
                  </div>
                  <div className="node-text">
                    <div className="node-title">TETHER CONTROL PLANE</div>
                    <div className="node-subtitle">BYPASSED</div>
                  </div>
                </div>
              </div>

              {/* Bottom telemetry warning indicators */}
              <div className="topology-status-row">
                <div className="status-item">
                  <AlertTriangle size={10} />
                  <span>No gate</span>
                </div>
                <div className="status-item">
                  <AlertTriangle size={10} />
                  <span>No ledger</span>
                </div>
                <div className="status-item">
                  <AlertTriangle size={10} />
                  <span>No approval</span>
                </div>
                <div className="status-item">
                  <AlertTriangle size={10} />
                  <span>No rollback</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Failure Checklist & Action Controls */}
        <div className="disaster-col-right">
          <div className="disaster-summary-card">
            <div className="summary-title">
              <span>TOTAL REVENUE LEAK</span>
              <strong>${leakAmount.toLocaleString()}</strong>
            </div>

            <ul className="disaster-checklist">
              <li data-active={visibleLogCount >= 2}>
                <span className="marker">✗</span>
                <span>No idempotency key</span>
              </li>
              <li data-active={visibleLogCount >= 1}>
                <span className="marker">✗</span>
                <span>No policy role gate</span>
              </li>
              <li data-active={visibleLogCount >= 1}>
                <span className="marker">✗</span>
                <span>No human approval</span>
              </li>
              <li data-active={visibleLogCount >= 3}>
                <span className="marker">✗</span>
                <span>No DSQL ledger write</span>
              </li>
              <li data-active={visibleLogCount >= 3}>
                <span className="marker">✗</span>
                <span>No rollback capability</span>
              </li>
            </ul>
          </div>

          {/* Integrated Actions Card */}
          <div className="disaster-actions-card">
            <div className="actions-info">
              <strong>COCKPIT BYPASSED</strong>
              <small>Enable governed write path to block duplicates.</small>
            </div>
            <div className="actions-buttons">
              <button
                onClick={onRestart}
                disabled={running}
                className="btn-restart"
                type="button"
              >
                <RotateCcw size={12} />
                <span>Restart</span>
              </button>
              <button
                onClick={onNext}
                disabled={!locked || running}
                className="btn-activate"
                type="button"
              >
                <span>Activate Tether</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuidedDemoOverlay({
  stepIndex,
  running,
  status,
  autoAdvance,
  onToggleAutoAdvance,
  onNext,
  onRestart,
}: {
  stepIndex: number;
  running: boolean;
  status: string | null;
  autoAdvance: boolean;
  onToggleAutoAdvance: (val: boolean) => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  const step = guidedSteps[stepIndex];

  return (
    <aside className="guided-demo-overlay" aria-live="polite">
      <div className="guided-progress" aria-label="Guided demo progress">
        {guidedSteps.map((item, index) => (
          <span
            aria-label={item.eyebrow}
            data-active={index === stepIndex}
            data-complete={index < stepIndex}
            key={item.eyebrow}
          />
        ))}
      </div>
      <span>{step.eyebrow}</span>
      <h2>{step.title}</h2>
      <p>{step.caption}</p>
      {status ? <code>{status}</code> : null}
      <div className="guided-controls">
        <button disabled={running} onClick={onRestart} type="button">
          <RefreshCcw aria-hidden="true" size={14} />
          Restart
        </button>
        <button disabled={running || stepIndex === guidedSteps.length - 1} onClick={onNext} type="button">
          Next
          <ArrowRight aria-hidden="true" size={14} />
        </button>
      </div>
      <div className="guided-overlay-footer">
        <label className="guided-switch-container">
          <span className="guided-switch-label">Auto-advance (6s)</span>
          <div className="guided-switch">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => onToggleAutoAdvance(e.target.checked)}
            />
            <span className="slider" />
          </div>
        </label>
        <small>{running ? "Running API step" : ""}</small>
      </div>
    </aside>
  );
}

const consoleFeatures = [
  {
    title: "Gate",
    body: "Control what agents can access and do.",
    visual: "/tether-assets/AstroGated.png",
  },
  {
    title: "Approve",
    body: "Human-in-the-loop when it matters.",
    visual: "/tether-assets/AstroMiniCheck.png",
  },
  {
    title: "Record",
    body: "Capture every action with immutable logs.",
    visual: "/tether-assets/AstrorecordImage.png",
  },
  {
    title: "Rollback",
    body: "Revert actions. Restore state. Reduce risk.",
    visual: "/tether-assets/AstroMiniRollback.png",
  },
  {
    title: "Govern",
    body: "Policies, permissions, and guardrails at scale.",
    visual: "/tether-assets/AstronautOnMiniMoonNoEffects.png",
  },
];

export function TetherConsole() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const guidedMode =
    searchParams.get("demo") === "guided" &&
    searchParams.get("key") === GUIDED_DEMO_KEY;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retryProof, setRetryProof] = useState<RetryProof | null>(null);
  const [mutationError, setMutationError] = useState<MutationError | null>(null);
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const guidedExecutedStep = useRef(-1);
  const guidedActionId = useRef<string | null>(null);
  const [guidedRunning, setGuidedRunning] = useState(false);
  const [guidedStatus, setGuidedStatus] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [activeView, setActiveView] = useState<ConsoleView>(() =>
    viewFromSearchParam(viewParam),
  );
  const [actingRole, setActingRole] = useState<ActingRole>("finance");
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchJson<DashboardData>("/v1/dashboard"),
    refetchInterval: 1000,
  });
  const policies = useQuery({
    queryKey: ["policies"],
    queryFn: () => fetchJson<PoliciesData>("/v1/policies"),
    refetchInterval: 5000,
  });
  const infrastructure = useQuery({
    queryKey: ["infrastructure"],
    queryFn: () => fetchJson<InfrastructureData>("/v1/infrastructure"),
    refetchInterval: 5000,
  });
  const data = dashboard.data;

  const actions = data?.actions ?? [];
  const selectedAction =
    actions.find((action) => action.id === selectedId) ??
    actions.find(
      (action) =>
        actionAmount(action) === 1250 &&
        roleFromGate(action) === "finance" &&
        action.status === "approval_required",
    ) ??
    actions[0] ??
    null;

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["dashboard"],
    });

  const invalidateProof = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["infrastructure"] }),
      ]),
    [queryClient],
  );

  const onError = (source: string) => (error: Error) => {
    setMutationError({ source, message: error.message });
  };

  const propose = useMutation({
    mutationFn: (draft: ComposerDraft) =>
      fetchJson<{ action_id: string }>("/v1/actions/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProposalFromDraft(draft)),
      }),
    onSuccess: (result) => {
      setMutationError(null);
      setSelectedId(result.action_id);
      void invalidate();
    },
    onError: onError("Propose refund"),
  });
  const reset = useMutation({
    mutationFn: () =>
      fetchJson<{ action_id: string }>("/v1/demo/reset", {
        method: "POST",
      }),
    onSuccess: (result) => {
      setMutationError(null);
      setRetryProof(null);
      setSelectedId(result.action_id);
      void invalidate();
    },
    onError: onError("Reset demo"),
  });
  const approve = useMutation({
    mutationFn: ({
      actionId,
      role,
    }: {
      actionId: string;
      role: ActingRole;
    }) =>
      fetchJson(`/v1/actions/${actionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "approve",
          note: `${roleLabel(role)} approved from Tether console.`,
          acting_role: role,
        }),
      }),
    onSuccess: () => {
      setMutationError(null);
      void invalidate();
    },
    onError: onError("Approve refund"),
  });
  const rollback = useMutation({
    mutationFn: (actionId: string) =>
      fetchJson(`/v1/actions/${actionId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performed_by_user_id: "00000000-0000-4000-8000-000000000102",
          reason: "Console rollback requested by finance.",
        }),
      }),
    onSuccess: () => {
      setMutationError(null);
      void invalidate();
    },
    onError: onError("Rollback action"),
  });
  const retry = useMutation({
    mutationFn: () =>
      fetchJson<RetryProof>("/v1/actions/retry-demo", {
        method: "POST",
      }),
    onSuccess: (result) => {
      setMutationError(null);
      setRetryProof(result);
      setSelectedId(result.action_id);
      void invalidate();
    },
    onError: onError("Simulate retry x3"),
  });

  function nextGuidedStep() {
    setGuidedStepIndex((current) =>
      Math.min(current + 1, guidedSteps.length - 1),
    );
  }

  async function restartGuidedDemo() {
    setGuidedRunning(true);
    setGuidedStatus("Resetting the production demo scenario.");

    try {
      const result = await fetchJson<{ action_id: string }>("/v1/demo/reset", {
        method: "POST",
      });

      setRetryProof(null);
      guidedActionId.current = null;
      setSelectedId(result.action_id);
      setActiveView("cockpit");
      setActingRole("finance");
      setMutationError(null);
      guidedExecutedStep.current = -1;
      setGuidedStepIndex(0);
      setRestartKey((k) => k + 1);
      void invalidateProof();
    } catch (error) {
      setMutationError({
        source: "Guided demo restart",
        message: error instanceof Error ? error.message : "Unknown restart error",
      });
    } finally {
      setGuidedRunning(false);
    }
  }

  useEffect(() => {
    if (!guidedMode || !autoAdvance || guidedRunning || guidedStepIndex === guidedSteps.length - 1) {
      return;
    }

    const timer = window.setTimeout(nextGuidedStep, GUIDED_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [guidedMode, autoAdvance, guidedRunning, guidedStepIndex]);

  useEffect(() => {
    if (!guidedMode || guidedExecutedStep.current === guidedStepIndex) {
      return;
    }

    let cancelled = false;

    async function runGuidedStep() {
      guidedExecutedStep.current = guidedStepIndex;
      setGuidedRunning(true);
      setGuidedStatus(null);

      try {
        if (guidedStepIndex === 0) {
          setActiveView("cockpit");
          setGuidedStatus("Problem framing only. No bad data is written.");
          return;
        }

        if (guidedStepIndex === 1) {
          setActiveView("cockpit");
          setRetryProof(null);
          const proposal = buildProposalFromDraft(defaultDraft);
          proposal.idempotency_key = `guided-refund-${Date.now()}`;
          await fetchJson<{ action_id: string }>("/v1/demo/reset", {
            method: "POST",
          });
          const result = await fetchJson<{
            action_id: string;
            status: string;
            required_approver_role: string | null;
          }>("/v1/actions/propose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proposal),
          });

          if (cancelled) return;
          guidedActionId.current = result.action_id;
          setSelectedId(result.action_id);
          void invalidateProof();
          setGuidedStatus(
            `Proposal ${shortId(result.action_id)} gated to ${roleLabel(
              result.required_approver_role,
            )}.`,
          );
          return;
        }

        if (guidedStepIndex === 2) {
          const result = await fetchJson<RetryProof>("/v1/actions/retry-demo", {
            method: "POST",
          });

          if (cancelled) return;
          setRetryProof(result);
          if (guidedActionId.current) setSelectedId(guidedActionId.current);
          setActiveView("cockpit");
          void invalidateProof();
          setGuidedStatus(
            `${result.attempts.length} attempts -> ${result.proposal_count} proposal -> ${result.execution_count} execution.`,
          );
          return;
        }

        if (guidedStepIndex === 3) {
          setActiveView("cockpit");
          setActingRole("support_lead");
          const proposal = buildProposalFromDraft(defaultDraft);
          proposal.idempotency_key = `guided-approval-${Date.now()}`;
          await fetchJson<{ action_id: string }>("/v1/demo/reset", {
            method: "POST",
          });
          const replayed = await fetchJson<{ action_id: string }>(
            "/v1/actions/propose",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(proposal),
            },
          );
          const actionId = replayed.action_id;
          guidedActionId.current = actionId;
          setSelectedId(actionId);
          void invalidateProof();

          let rejection = "approval blocked";
          let wrongRoleSucceeded = false;
          try {
            await fetchJson(`/v1/actions/${actionId}/decision`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                decision: "approve",
                note: "Guided demo wrong-role proof.",
                approver_user_id: SUPPORT_LEAD_USER_ID,
                acting_role: "support_lead",
              }),
            });
            wrongRoleSucceeded = true;
          } catch (error) {
            rejection = error instanceof Error ? error.message : rejection;
          }

          if (wrongRoleSucceeded) {
            throw new Error("Wrong-role approval unexpectedly succeeded.");
          }

          setActingRole("finance");
          const approval = await fetchJson<{ status: string }>(
            `/v1/actions/${actionId}/decision`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                decision: "approve",
                note: "Guided demo finance approval.",
                approver_user_id: FINANCE_USER_ID,
                acting_role: "finance",
              }),
            },
          );

          if (cancelled) return;
          setSelectedId(actionId);
          void invalidateProof();
          setGuidedStatus(
            `Support lead rejected: ${rejection} Finance approval wrote ${approval.status}.`,
          );
          return;
        }

        if (guidedStepIndex === 4) {
          const actionId = guidedActionId.current;
          if (!actionId) throw new Error("Guided proposal has not been created.");

          setActiveView("cockpit");
          const result = await fetchJson<{
            status: string;
            restored_version_id: string | null;
            compensation_action_id: string | null;
          }>(`/v1/actions/${actionId}/rollback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              performed_by_user_id: FINANCE_USER_ID,
              reason: "Guided demo rollback.",
            }),
          });

          if (cancelled) return;
          setSelectedId(actionId);
          void invalidateProof();
          setGuidedStatus(
            `${humanLabel(result.status)}. Restore=${shortId(
              result.restored_version_id,
            )}; compensation=${shortId(result.compensation_action_id)}.`,
          );
          return;
        }

        if (guidedStepIndex === 5) {
          setActiveView("infrastructure");
          void invalidateProof();
          setGuidedStatus("Live production proof view.");
        }
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unknown guided demo error";
        setMutationError({ source: "Guided demo", message });
        setGuidedStatus(message);
      } finally {
        if (!cancelled) setGuidedRunning(false);
      }
    }

    void runGuidedStep();

    return () => {
      cancelled = true;
    };
  }, [
    guidedMode,
    guidedStepIndex,
    invalidateProof,
  ]);

  function renderActiveView() {
    if (guidedMode && guidedStepIndex === 0 && activeView === "cockpit") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <GuidedColdOpen
            key={restartKey}
            onNext={nextGuidedStep}
            onRestart={restartGuidedDemo}
            running={guidedRunning}
          />
          <section className="feature-band" style={{ width: "100%", maxWidth: "100%", margin: "0" }} aria-label="Tether capabilities">
            {consoleFeatures.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h2>{feature.title}</h2>
                <div className="feature-glyph" aria-hidden="true" style={{ minHeight: "84px", display: "flex", alignItems: "center" }}>
                  <Image
                    className={`feature-art feature-art-${feature.title.toLowerCase()}`}
                    src={feature.visual}
                    alt={feature.title}
                    width={156}
                    height={92}
                    style={{ objectFit: "contain", maxHeight: "84px", width: "auto" }}
                  />
                </div>
                <p>{feature.body}</p>
              </article>
            ))}
          </section>
        </div>
      );
    }

    if (activeView === "ledger") {
      return (
        <LedgerView versions={data?.versions ?? []} actions={actions} />
      );
    }

    if (activeView === "audit") {
      return (
        <AuditTrailView
          auditEvents={data?.auditEvents ?? []}
          actions={actions}
        />
      );
    }

    if (activeView === "policies") {
      return <PoliciesView policies={policies.data} />;
    }

    if (activeView === "infrastructure") {
      return (
        <InfrastructureView
          infrastructure={infrastructure.data}
          traces={data?.traces ?? []}
          retryProof={retryProof}
          retrying={retry.isPending}
          onRetry={() => retry.mutate()}
        />
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <div className="console-grid">
          <AgentIntake
            actions={actions}
            selectedId={selectedAction?.id ?? null}
            onSelect={setSelectedId}
            onPropose={(draft) => propose.mutate(draft)}
            onReset={() => reset.mutate()}
            proposing={propose.isPending}
            resetting={reset.isPending}
          />
          <PolicyGate
            action={selectedAction}
            entity={data?.entity ?? null}
            versions={data?.versions ?? []}
          />
          <DecisionPanel
            action={selectedAction}
            actingRole={actingRole}
            approving={approve.isPending}
            onApprove={() =>
              selectedAction &&
              approve.mutate({ actionId: selectedAction.id, role: actingRole })
            }
            rollingBack={rollback.isPending}
            onRollback={() => selectedAction && rollback.mutate(selectedAction.id)}
            retrying={retry.isPending}
            onRetry={() => retry.mutate()}
            retryProof={retryProof}
          />
          <FlightRecorder traces={data?.traces ?? []} />
        </div>

        <section className="feature-band" style={{ width: "100%", maxWidth: "100%", margin: "0" }} aria-label="Tether capabilities">
          {consoleFeatures.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h2>{feature.title}</h2>
              <div className="feature-glyph" aria-hidden="true" style={{ minHeight: "84px", display: "flex", alignItems: "center" }}>
                <Image
                  className={`feature-art feature-art-${feature.title.toLowerCase()}`}
                  src={feature.visual}
                  alt={feature.title}
                  width={156}
                  height={92}
                  style={{ objectFit: "contain", maxHeight: "84px", width: "auto" }}
                />
              </div>
              <p>{feature.body}</p>
            </article>
          ))}
        </section>
      </div>
    );
  }

  if (dashboard.isLoading) return <Skeleton />;

  if (dashboard.isError) {
    return (
      <div className="console-shell">
        <div className="error-state">
          <strong>Dashboard failed to load.</strong>
          <span>
            {dashboard.error instanceof Error
              ? dashboard.error.message
              : "Check the local server and DSQL credentials."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="console-shell">
      <ConsoleSidebar activeView={activeView} onChange={setActiveView} />
      <section className="console-main">
        <MissionStrip
          activeView={activeView}
          data={data}
          selectedAction={selectedAction}
          actingRole={actingRole}
          onRoleChange={setActingRole}
        />
        {guidedMode && guidedStepIndex === 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="tether-intercept-alert"
          >
            <span>🛡️ Governed write path online · Tether intercept enabled</span>
          </motion.div>
        )}
        {mutationError ? (
          <div className="toast" role="status">
            <strong>{mutationError.source} failed.</strong>
            <span>{mutationError.message}</span>
          </div>
        ) : null}
        {renderActiveView()}
      </section>
      {guidedMode && guidedStepIndex > 0 ? (
        <GuidedDemoOverlay
          stepIndex={guidedStepIndex}
          running={guidedRunning}
          status={guidedStatus}
          autoAdvance={autoAdvance}
          onToggleAutoAdvance={setAutoAdvance}
          onNext={nextGuidedStep}
          onRestart={restartGuidedDemo}
        />
      ) : null}
    </main>
  );
}
