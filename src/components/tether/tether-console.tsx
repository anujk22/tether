"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Database,
  GitMerge,
  RotateCcw,
  ShieldCheck,
  Split,
  Undo2,
  XCircle,
} from "lucide-react";

import { scriptedRefundProposal } from "@/lib/demo/scripted-proposal";

type JsonRecord = Record<string, unknown>;

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

const lifecycle = [
  "proposed",
  "gated",
  "approval_required",
  "approved",
  "executed",
  "rolled_back",
  "compensated",
] as const;

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
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (value == null) return "none";
  return JSON.stringify(value);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
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

function diffRows(action: ActionSummary) {
  const keys = [
    "refund_status",
    "ticket_priority",
    "customer_health",
    "csm_notified",
    "refund_amount",
  ];

  return keys
    .filter((key) => key in action.prior_state || key in action.proposed_changes)
    .map((key) => ({
      key,
      before: action.prior_state[key],
      after: action.proposed_changes[key] ?? action.prior_state[key],
      changed: action.proposed_changes[key] !== undefined,
    }));
}

function StatusPill({ status }: { status: string }) {
  const Icon = stateIcon[status] ?? Clock3;

  return (
    <span className="status-pill" data-state={status}>
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
  proposing,
}: {
  actions: ActionSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPropose: () => void;
  proposing: boolean;
}) {
  return (
    <section className="console-panel intake-panel" aria-labelledby="agent-intake">
      <PanelTitle icon={Split} title="Agent Intake" aside={`${actions.length} actions`} />
      <div className="action-list" role="listbox" aria-labelledby="agent-intake">
        {actions.length ? (
          actions.map((action) => (
            <button
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
                <CircleDollarSign aria-hidden="true" size={16} />
                <strong>{money(action.proposed_changes.refund_amount)}</strong>
                <span>{action.action_type_key.replaceAll("_", " ")}</span>
              </span>
              <span className="action-card-meta">
                <span>{action.risk_level}</span>
                <code>{shortId(action.id)}</code>
              </span>
            </button>
          ))
        ) : (
          <div className="empty-state">No proposed actions</div>
        )}
      </div>
      <button
        className="primary-control"
        disabled={proposing}
        onClick={onPropose}
        type="button"
      >
        <CircleDollarSign aria-hidden="true" size={16} />
        {proposing ? "Proposing" : "Propose refund"}
      </button>
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
  const currentIndex = action
    ? Math.max(
        0,
        lifecycle.findIndex((status) => status === action.status),
      )
    : 0;
  const rows = action ? diffRows(action) : [];
  const activeVersion = versions.find((version) => version.is_active);

  return (
    <section className="console-panel gate-panel" aria-labelledby="policy-gate">
      <PanelTitle
        icon={ShieldCheck}
        title="Policy Gate"
        aside={entity ? entity.external_ref : "loading"}
      />
      <div className="ledger-rail" aria-label="Action state machine">
        {lifecycle.map((status, index) => {
          const active = index <= currentIndex;
          const Icon = stateIcon[status] ?? Clock3;

          return (
            <div className="rail-step" data-active={active} key={status}>
              <motion.span
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        scale: active && index === currentIndex ? [1, 1.08, 1] : 1,
                      }
                }
                transition={{ duration: 1.2, repeat: active ? Infinity : 0 }}
                className="rail-node"
                data-state={status}
              >
                <Icon aria-hidden="true" size={15} />
              </motion.span>
              <span>{stateLabels[status]}</span>
            </div>
          );
        })}
      </div>
      <div className="policy-strip">
        <div>
          <span>Matched policy</span>
          <strong>{String(action?.gate.policy_title ?? "Refund authority")}</strong>
        </div>
        <div>
          <span>Required role</span>
          <strong>
            {String(action?.gate.required_approver_role ?? "none").replaceAll(
              "_",
              " ",
            )}
          </strong>
        </div>
        <div>
          <span>Active version</span>
          <strong>v{activeVersion?.version_number ?? entity?.version_number ?? "-"}</strong>
        </div>
      </div>
      <div className="diff-table" aria-label="Before and after state diff">
        {action ? (
          rows.map((row) => (
            <div className="diff-row" data-changed={row.changed} key={row.key}>
              <code>{row.key}</code>
              <span>{formatValue(row.before)}</span>
              <span aria-hidden="true">→</span>
              <strong>{formatValue(row.after)}</strong>
            </div>
          ))
        ) : (
          <div className="empty-state">No action selected</div>
        )}
      </div>
    </section>
  );
}

function DecisionPanel({
  action,
  onApprove,
  onRollback,
  onRetry,
  approving,
  rollingBack,
  retrying,
  retryProof,
}: {
  action: ActionSummary | null;
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
          <div className="evidence-list">
            {evidence.map((item) => (
              <div className="evidence-row" key={`${item.label}-${item.source}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <code>{item.source}</code>
              </div>
            ))}
          </div>
          <div className="reversibility">
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
              type="button"
            >
              <CheckCircle2 aria-hidden="true" size={16} />
              {approving ? "Approving" : "Approve refund"}
            </button>
            <button
              className="secondary-control"
              disabled={!canRollback || rollingBack}
              onClick={onRollback}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} />
              {rollingBack ? "Rolling back" : "Rollback action"}
            </button>
          </div>
        </>
      ) : (
        <div className="empty-state">Select an action</div>
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
        <div className="retry-attempts" aria-label="Retry proof attempts">
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
          <code>{retryProof ? shortId(retryProof.action_id) : "one survives"}</code>
        </div>
      </div>
    </section>
  );
}

function FlightRecorder({ traces }: { traces: TraceRow[] }) {
  return (
    <section className="console-panel recorder-panel" aria-labelledby="flight-recorder">
      <PanelTitle icon={Database} title="DSQL Flight Recorder" aside="operation_traces" />
      <div className="trace-stream" aria-live="polite">
        {traces.length ? (
          traces.slice(-32).map((trace) => (
            <motion.div
              className="trace-row"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              key={trace.id}
            >
              <time>{formatTime(trace.created_at)}</time>
              <span>{trace.operation}</span>
              <code>{trace.table_name}</code>
              <p>{trace.summary}</p>
              <code>{shortId(trace.action_id)}</code>
            </motion.div>
          ))
        ) : (
          <div className="empty-state">No trace rows</div>
        )}
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

export function TetherConsole() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retryProof, setRetryProof] = useState<RetryProof | null>(null);
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchJson<DashboardData>("/v1/dashboard"),
    refetchInterval: 1000,
  });
  const data = dashboard.data;

  const actions = data?.actions ?? [];
  const selectedAction =
    actions.find((action) => action.id === selectedId) ?? actions[0] ?? null;

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["dashboard"],
    });

  const propose = useMutation({
    mutationFn: () =>
      fetchJson<{ action_id: string }>("/v1/actions/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scriptedRefundProposal(`ui-refund-${Date.now()}`)),
      }),
    onSuccess: (result) => {
      setSelectedId(result.action_id);
      void invalidate();
    },
  });
  const approve = useMutation({
    mutationFn: (actionId: string) =>
      fetchJson(`/v1/actions/${actionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "approve",
          note: "Finance approved from Tether console.",
        }),
      }),
    onSuccess: () => void invalidate(),
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
    onSuccess: () => void invalidate(),
  });
  const retry = useMutation({
    mutationFn: () =>
      fetchJson<RetryProof>("/v1/actions/retry-demo", {
        method: "POST",
      }),
    onSuccess: (result) => {
      setRetryProof(result);
      setSelectedId(result.action_id);
      void invalidate();
    },
  });

  if (dashboard.isLoading) return <Skeleton />;

  if (dashboard.isError) {
    return (
      <div className="console-shell">
        <div className="error-state">
          {dashboard.error instanceof Error
            ? dashboard.error.message
            : "Dashboard failed to load"}
        </div>
      </div>
    );
  }

  return (
    <main className="console-shell">
      <header className="console-header">
        <div>
          <span>Tether</span>
          <h1>The control plane for AI agents that act</h1>
        </div>
        <div className="header-metrics" aria-label="Current ledger state">
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
      <div className="console-grid">
        <AgentIntake
          actions={actions}
          selectedId={selectedAction?.id ?? null}
          onSelect={setSelectedId}
          onPropose={() => propose.mutate()}
          proposing={propose.isPending}
        />
        <PolicyGate
          action={selectedAction}
          entity={data?.entity ?? null}
          versions={data?.versions ?? []}
        />
        <DecisionPanel
          action={selectedAction}
          approving={approve.isPending}
          onApprove={() => selectedAction && approve.mutate(selectedAction.id)}
          rollingBack={rollback.isPending}
          onRollback={() => selectedAction && rollback.mutate(selectedAction.id)}
          retrying={retry.isPending}
          onRetry={() => retry.mutate()}
          retryProof={retryProof}
        />
        <FlightRecorder traces={data?.traces ?? []} />
      </div>
    </main>
  );
}
