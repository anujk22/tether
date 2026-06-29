"use client";

import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Activity,
  BookOpen,
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

type ConsoleView = "cockpit" | "ledger" | "audit" | "policies" | "infrastructure";
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

const consoleViews: Array<{
  key: ConsoleView;
  label: string;
  icon: typeof Clock3;
}> = [
  { key: "cockpit", label: "Action Cockpit", icon: Activity },
  { key: "ledger", label: "Ledger", icon: History },
  { key: "audit", label: "Audit Trail", icon: ListChecks },
  { key: "policies", label: "Policies", icon: BookOpen },
  { key: "infrastructure", label: "Aurora DSQL", icon: Network },
];

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

  return `${action.action_type_key.replaceAll("_", " ")} · ${shortId(action.id)}`;
}

function jsonPreview(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function evidenceItems(action: ActionSummary): Array<{
  label: string;
  value: string;
  source: string;
}> {
  return action.evidence
    .filter((item): item is { label: string; value: string; source: string } =>
      Boolean(
        item &&
          typeof item === "object" &&
          "label" in item &&
          "value" in item &&
          "source" in item,
      ),
    )
    .slice(0, 3);
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

function StatusPill({ status }: { status: string }) {
  const Icon = stateIcon[status] ?? Clock3;

  return (
    <span className="status-pill" style={stateStyle(status)}>
      <Icon aria-hidden="true" size={14} />
      {stateLabels[status] ?? status}
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

function AgentIntake({
  actions,
  selectedId,
  onSelect,
  onPropose,
  onPreset,
  onReset,
  proposing,
  resetting,
}: {
  actions: ActionSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPropose: (draft: ComposerDraft) => void;
  onPreset: () => void;
  onReset: () => void;
  proposing: boolean;
  resetting: boolean;
}) {
  const [draft, setDraft] = useState<ComposerDraft>(defaultDraft);

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
      <PanelTitle icon={Split} title="Agent Intake" aside={`${actions.length} actions`} />
      <form className="action-composer" onSubmit={submitAction}>
        <div className="composer-heading">
          <span>New action</span>
          <button
            disabled={proposing || resetting}
            onClick={() => {
              setDraft(defaultDraft);
              onPreset();
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
            <span>Refund amount</span>
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
        {actions.length ? (
          actions.map((action) => (
            <button
              aria-pressed={selectedId === action.id}
              className="action-card"
              data-selected={selectedId === action.id}
              key={action.id}
              onClick={() => onSelect(action.id)}
              type="button"
            >
              <span className="action-card-top">
                <span>{action.agent_name}</span>
                <StatusPill status={action.status} />
              </span>
              <span className="action-card-main">
                <strong>
                  <span>$</span>
                  {money(action.proposed_changes.refund_amount).replace("$", "")}
                </strong>
                <span>{action.action_type_key.replaceAll("_", " ")}</span>
              </span>
              <span className="action-card-meta">
                <span>{action.risk_level}</span>
                <code>{shortId(action.id)}</code>
              </span>
            </button>
          ))
        ) : (
          <div className="empty-state">Queue clear — propose an action to begin.</div>
        )}
      </div>
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
              <span>{stateLabels[status]}</span>
              {index < lifecycle.length - 1 ? (
                <span className="rail-connector" aria-hidden="true" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="policy-strip">
        <motion.div
          animate={
            !reducedMotion && action?.status === "approval_required"
              ? { borderColor: ["var(--state-approval)", "var(--border-subtle)"] }
              : undefined
          }
          transition={{ duration: 0.7 }}
        >
          <span>Matched policy</span>
          <strong>{String(action?.gate.policy_title ?? "Refund authority")}</strong>
        </motion.div>
        <div>
          <span>Required role</span>
          <strong>
            {String(action?.gate.required_approver_role ?? "none").replaceAll("_", " ")}
          </strong>
        </div>
        <div className="version-card">
          <span>Active version</span>
          <strong>
            v{activeVersion?.version_number ?? entity?.version_number ?? "-"}
            {isRollback ? <em> restoring v4</em> : null}
          </strong>
        </div>
      </div>
      <div className="diff-table" aria-label="Before and after state diff">
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
  const canApprove = action?.status === "approval_required";
  const canRollback = action?.status === "executed";
  const evidence = action ? evidenceItems(action) : [];

  return (
    <section className="console-panel decision-panel" aria-labelledby="decision">
      <PanelTitle icon={CheckCircle2} title="Decision" aside={action ? shortId(action.id) : ""} />
      {action ? (
        <>
          <div className="decision-summary">
            <StatusPill status={action.status} />
            <p>{action.rationale}</p>
          </div>
          <div className="role-context-card">
            <span>Acting as</span>
            <strong>{actingRole.replaceAll("_", " ")}</strong>
            <span>Required role</span>
            <strong>
              {String(action.gate.required_approver_role ?? "none").replaceAll(
                "_",
                " ",
              )}
            </strong>
          </div>
          <div className="evidence-list">
            {evidence.map((item) => (
              <div className="evidence-row" key={`${item.label}-${item.source}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <code>{item.source}</code>
              </div>
            ))}
          </div>
          <div className="reversibility" style={stateStyle("compensated")}>
            <span>Reversibility</span>
            <strong>
              {action.reversibility_class === "IRREVERSIBLE_EXTERNAL"
                ? "Compensation required"
                : "Exact rollback available"}
            </strong>
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
          {retrying ? "Merging attempts" : "Simulate retry ×3"}
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
              : "one proposal survives"}
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

  return (
    <section className="console-panel recorder-panel" aria-labelledby="flight-recorder">
      <div className="recorder-title">
        <PanelTitle icon={Database} title="DSQL Flight Recorder" aside="operation_traces" />
        <span className="rec-light">REC</span>
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

function ConsoleSidebar({
  activeView,
  onChange,
}: {
  activeView: ConsoleView;
  onChange: (view: ConsoleView) => void;
}) {
  return (
    <aside className="console-sidebar" aria-label="Console views">
      <div className="sidebar-brand">
        <strong>Tether</strong>
        <span>Control plane</span>
      </div>
      <nav>
        {consoleViews.map((view) => {
          const Icon = view.icon;

          return (
            <button
              aria-current={activeView === view.key ? "page" : undefined}
              data-active={activeView === view.key}
              key={view.key}
              onClick={() => onChange(view.key)}
              type="button"
            >
              <Icon aria-hidden="true" size={16} />
              {view.label}
            </button>
          );
        })}
      </nav>
    </aside>
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
              <strong>{event.event_type.replaceAll("_", " ")}</strong>
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
            <h3>{rule.action_type_key.replaceAll("_", " ")}</h3>
            <dl>
              <div>
                <dt>Decision</dt>
                <dd>{rule.decision.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Required role</dt>
                <dd>{rule.required_approver_role?.replaceAll("_", " ") ?? "none"}</dd>
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
  return (
    <section className="console-panel view-panel infrastructure-view">
      <PanelTitle icon={Network} title="Infrastructure / Aurora DSQL" aside="live proof" />
      <div className="infra-status-line">
        Aurora DSQL · {infrastructure?.region ?? "us-east-1"} ·{" "}
        {infrastructure?.auth ?? "IAM token auth"} ·{" "}
        {infrastructure?.consistency ?? "strong consistency"} ·{" "}
        {infrastructure?.isolation ?? "snapshot isolation"} · Next.js on Vercel
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
          index handling collapses them to one proposal and one execution.
        </p>
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

export function TetherConsole() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retryProof, setRetryProof] = useState<RetryProof | null>(null);
  const [mutationError, setMutationError] = useState<MutationError | null>(null);
  const [activeView, setActiveView] = useState<ConsoleView>("cockpit");
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
    actions.find((action) => action.id === selectedId) ?? actions[0] ?? null;

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["dashboard"],
    });

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
          note: `${role.replaceAll("_", " ")} approved from Tether console.`,
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
    onError: onError("Simulate retry ×3"),
  });

  function renderActiveView() {
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
      <div className="console-grid">
        <AgentIntake
          actions={actions}
          selectedId={selectedAction?.id ?? null}
          onSelect={setSelectedId}
          onPropose={(draft) => propose.mutate(draft)}
          onPreset={() => propose.mutate(defaultDraft)}
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
        <header className="console-header">
          <div>
            <h1>{consoleViews.find((view) => view.key === activeView)?.label}</h1>
            <span>The control plane for AI agents that act</span>
          </div>
          <div className="header-metrics" aria-label="Current ledger state">
            <label className="role-selector">
              <span>Acting as</span>
              <select
                value={actingRole}
                onChange={(event) =>
                  setActingRole(event.currentTarget.value as ActingRole)
                }
              >
                {actingRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <span>
              v<strong>{data?.entity.version_number ?? "-"}</strong>
            </span>
            <span>
              traces<strong>{data?.traces.length ?? 0}</strong>
            </span>
            <span>
              actions<strong>{data?.actions.length ?? 0}</strong>
            </span>
          </div>
        </header>
        {mutationError ? (
          <div className="toast" role="status">
            <strong>{mutationError.source} failed.</strong>
            <span>{mutationError.message}</span>
          </div>
        ) : null}
        {renderActiveView()}
      </section>
    </main>
  );
}
