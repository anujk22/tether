"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  GitMerge,
  RotateCcw,
  ShieldCheck,
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

type AuditRow = {
  id: string;
  action_id: string | null;
  event_type: string;
  payload: JsonRecord;
  created_at: string;
};

type DashboardData = {
  actions: ActionSummary[];
  entity: EntitySnapshot;
  versions: EntityVersion[];
  traces: TraceRow[];
  auditEvents: AuditRow[];
};

type RetryProof = {
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
];

const diffKeys = [
  "refund_status",
  "ticket_priority",
  "customer_health",
  "csm_notified",
  "refund_amount",
];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${url}`);
  }

  return body as T;
}

function TetherLogo() {
  return (
    <span className="brand-lockup" aria-label="Tether">
      <span className="pixel-mark" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} />
        ))}
      </span>
      <span>Tether</span>
    </span>
  );
}

function shortId(id: string | null | undefined): string {
  if (!id) return "none";
  return id.slice(0, 8);
}

function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (value == null) return "none";
  return JSON.stringify(value);
}

function formatTime(value: string): string {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function statusLabel(status: string | undefined): string {
  return status ? status.replaceAll("_", " ") : "no action";
}

function evidenceItems(action: ActionSummary | undefined) {
  return (action?.evidence ?? [])
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

function diffRows(action: ActionSummary | undefined) {
  if (!action) return [];

  return diffKeys
    .filter((key) => key in action.prior_state || key in action.proposed_changes)
    .map((key) => {
      const before = action.prior_state[key];
      const after =
        key in action.proposed_changes ? action.proposed_changes[key] : before;

      return {
        key,
        before,
        after,
        changed: JSON.stringify(before) !== JSON.stringify(after),
      };
    });
}

function actionOrder(actions: ActionSummary[]): ActionSummary[] {
  return [...actions].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

export function ProductCockpit() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("Connected to the Tether control plane.");

  const actions = useMemo(
    () => actionOrder(dashboard?.actions ?? []),
    [dashboard?.actions],
  );
  const selectedAction =
    actions.find((action) => action.id === selectedId) ?? actions[0];
  const currentStep = Math.max(0, lifecycle.indexOf(selectedAction?.status ?? ""));
  const canApprove = selectedAction?.status === "approval_required";
  const canReject = selectedAction?.status === "approval_required";
  const canRollback = selectedAction?.status === "executed";
  const traces = (dashboard?.traces ?? []).slice(-18).reverse();
  const auditEvents = (dashboard?.auditEvents ?? []).slice(-10).reverse();

  async function refresh() {
    const next = await fetchJson<DashboardData>("/v1/dashboard");
    setDashboard(next);
    setSelectedId((current) => current ?? next.actions[0]?.id ?? null);
    return next;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const next = await fetchJson<DashboardData>("/v1/dashboard");
        if (!active) return;
        setDashboard(next);
        setSelectedId((current) => current ?? next.actions[0]?.id ?? null);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Dashboard failed.");
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 1500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function run(label: string, mutation: () => Promise<unknown>) {
    setBusy(label);
    setMessage(`${label} running...`);

    try {
      const result = await mutation();
      const next = await refresh();

      if (label === "Retry x3") {
        const retry = result as RetryProof;
        setSelectedId(retry.action_id);
        setMessage(
          `Retry proof complete: ${retry.proposal_count} proposal, ${retry.execution_count} execution, 0 double refunds.`,
        );
      } else {
        setMessage(`${label} completed. DSQL now has ${next.traces.length} trace rows.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} failed.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="product-shell">
      <header className="product-topbar">
        <Link href="/" aria-label="Go to Tether home">
          <TetherLogo />
        </Link>
        <nav aria-label="Product navigation">
          <Link href="/">Home</Link>
          <Link href="/product" aria-current="page">
            Product
          </Link>
          <Link href="/docs">Docs</Link>
          <Link href="/solutions">Solutions</Link>
        </nav>
        <button
          className="button button-light"
          disabled={busy !== null}
          onClick={() =>
            void run("Reset demo", () =>
              fetchJson("/v1/demo/reset", { method: "POST" }),
            )
          }
          type="button"
        >
          Reset demo
          <ArrowRight size={16} />
        </button>
      </header>

      <section className="product-hero">
        <div>
          <span className="product-kicker">Aurora DSQL control plane</span>
          <h1>Operate the agent write path.</h1>
          <p>
            This page is wired to the backend: every proposal, approval,
            execution, rollback, compensation row, audit event, and trace is read
            from the live DSQL-backed API.
          </p>
        </div>
        <div className="product-metrics" aria-label="Live database counters">
          <span>
            active version <strong>v{dashboard?.entity.version_number ?? "-"}</strong>
          </span>
          <span>
            actions <strong>{actions.length}</strong>
          </span>
          <span>
            traces <strong>{dashboard?.traces.length ?? 0}</strong>
          </span>
          <span>
            selected <strong>{statusLabel(selectedAction?.status)}</strong>
          </span>
        </div>
      </section>

      <section className="product-toolbar" aria-label="Control plane commands">
        <button
          disabled={busy !== null}
          onClick={() =>
            void run("Propose refund", () =>
              fetchJson("/v1/actions/propose", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(scriptedRefundProposal(`cockpit-${Date.now()}`)),
              }),
            )
          }
          type="button"
        >
          Propose refund
        </button>
        <button
          disabled={!canApprove || busy !== null}
          onClick={() =>
            selectedAction &&
            void run("Approve refund", () =>
              fetchJson(`/v1/actions/${selectedAction.id}/decision`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  decision: "approve",
                  note: "Approved from product cockpit.",
                }),
              }),
            )
          }
          type="button"
        >
          <CheckCircle2 size={15} />
          Approve
        </button>
        <button
          disabled={!canReject || busy !== null}
          onClick={() =>
            selectedAction &&
            void run("Reject refund", () =>
              fetchJson(`/v1/actions/${selectedAction.id}/decision`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  decision: "reject",
                  note: "Rejected from product cockpit.",
                }),
              }),
            )
          }
          type="button"
        >
          <XCircle size={15} />
          Reject
        </button>
        <button
          disabled={!canRollback || busy !== null}
          onClick={() =>
            selectedAction &&
            void run("Rollback action", () =>
              fetchJson(`/v1/actions/${selectedAction.id}/rollback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  performed_by_user_id: "00000000-0000-4000-8000-000000000102",
                  reason: "Product cockpit rollback requested by finance.",
                }),
              }),
            )
          }
          type="button"
        >
          <RotateCcw size={15} />
          Rollback
        </button>
        <button
          disabled={busy !== null}
          onClick={() =>
            void run("Retry x3", () =>
              fetchJson<RetryProof>("/v1/actions/retry-demo", { method: "POST" }),
            )
          }
          type="button"
        >
          <GitMerge size={15} />
          Retry x3
        </button>
        <p>{busy ?? message}</p>
      </section>

      <section className="product-grid">
        <aside className="product-panel action-panel">
          <div className="panel-heading">
            <h2>Action Queue</h2>
            <span>{actions.length} records</span>
          </div>
          <div className="action-stack">
            {actions.map((action) => (
              <button
                aria-pressed={selectedAction?.id === action.id}
                className="queue-card"
                data-active={selectedAction?.id === action.id}
                key={action.id}
                onClick={() => setSelectedId(action.id)}
                type="button"
              >
                <span>
                  {action.agent_name}
                  <b>{statusLabel(action.status)}</b>
                </span>
                <strong>{action.action_type_key.replaceAll("_", " ")}</strong>
                <code>{shortId(action.id)} · {action.risk_level}</code>
              </button>
            ))}
          </div>
        </aside>

        <section className="product-panel gate-workbench">
          <div className="panel-heading">
            <h2>Policy Gate</h2>
            <span>{selectedAction ? shortId(selectedAction.id) : "no action"}</span>
          </div>

          <div className="state-rail">
            {lifecycle.map((status, index) => (
              <span
                data-state={
                  index < currentStep
                    ? "complete"
                    : index === currentStep
                      ? "active"
                      : "pending"
                }
                key={status}
              >
                {statusLabel(status)}
              </span>
            ))}
          </div>

          <div className="policy-facts">
            <span>
              matched policy
              <strong>
                {String(selectedAction?.gate.policy_title ?? "Refund authority")}
              </strong>
            </span>
            <span>
              required role
              <strong>
                {String(
                  selectedAction?.gate.required_approver_role ?? "none",
                ).replaceAll("_", " ")}
              </strong>
            </span>
            <span>
              reversibility
              <strong>
                {selectedAction?.reversibility_class.replaceAll("_", " ") ??
                  "none"}
              </strong>
            </span>
          </div>

          <div className="snapshot-diff">
            {diffRows(selectedAction).map((row) => (
              <div data-changed={row.changed} key={row.key}>
                <code>{row.key}</code>
                <span>{formatValue(row.before)}</span>
                <b>→</b>
                <strong>{formatValue(row.after)}</strong>
              </div>
            ))}
          </div>

          <div className="evidence-grid">
            {evidenceItems(selectedAction).map((item) => (
              <article key={`${item.label}-${item.source}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <code>{item.source}</code>
              </article>
            ))}
          </div>
        </section>

        <aside className="product-panel entity-panel">
          <div className="panel-heading">
            <h2>Entity State</h2>
            <span>{dashboard?.entity.external_ref ?? "loading"}</span>
          </div>
          <div className="state-json">
            {Object.entries(dashboard?.entity.state ?? {}).map(([key, value]) => (
              <div key={key}>
                <code>{key}</code>
                <strong>{formatValue(value)}</strong>
              </div>
            ))}
          </div>
          <div className="version-list">
            {(dashboard?.versions ?? []).slice(-5).reverse().map((version) => (
              <span data-active={version.is_active} key={version.id}>
                v{version.version_number}
                <code>{version.is_active ? "active" : shortId(version.created_by_action_id)}</code>
              </span>
            ))}
          </div>
        </aside>

        <section className="product-panel trace-panel">
          <div className="panel-heading">
            <h2>
              <Database size={16} />
              DSQL Flight Recorder
            </h2>
            <span>operation_traces</span>
          </div>
          <div className="trace-table">
            {traces.map((trace) => (
              <div key={trace.id}>
                <time>{formatTime(trace.created_at)}</time>
                <span>{trace.operation}</span>
                <code>{trace.table_name}</code>
                <p>{trace.summary}</p>
                <code>{shortId(trace.action_id)}</code>
              </div>
            ))}
          </div>
        </section>

        <section className="product-panel audit-panel">
          <div className="panel-heading">
            <h2>Audit Events</h2>
            <span>real rows</span>
          </div>
          <div className="audit-list">
            {auditEvents.map((event) => (
              <article key={event.id}>
                <span>{event.event_type}</span>
                <code>{shortId(event.action_id)}</code>
                <p>{JSON.stringify(event.payload)}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
