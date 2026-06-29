import { query } from "../db/client";
import { getDsqlEnv } from "../db/env";
import type { ActionStatus, JsonRecord, ReversibilityClass } from "../domain/types";
import { DEMO_IDS } from "../demo/ids";
import { asJsonRecord } from "./json";

export type ActionSummary = {
  id: string;
  agent_id: string;
  agent_name: string;
  entity_id: string;
  action_type_key: string;
  proposed_changes: JsonRecord;
  prior_state: JsonRecord;
  rationale: string;
  evidence: unknown[];
  risk_level: string;
  status: ActionStatus;
  reversibility_class: ReversibilityClass;
  idempotency_key: string;
  created_at: string;
  gate: JsonRecord;
};

export type EntitySnapshot = {
  id: string;
  entity_type: string;
  external_ref: string;
  current_version_id: string;
  version_number: number;
  state: JsonRecord;
};

export type EntityVersionSummary = {
  id: string;
  version_number: number;
  state: JsonRecord;
  is_active: boolean;
  created_by_action_id: string | null;
  created_at: string;
};

export type TraceRow = {
  id: string;
  action_id: string | null;
  operation: string;
  table_name: string;
  summary: string;
  created_at: string;
};

export type AuditRow = {
  id: string;
  action_id: string | null;
  event_type: string;
  payload: JsonRecord;
  created_at: string;
};

export type PolicyRuleSummary = {
  id: string;
  action_type_key: string;
  condition: JsonRecord;
  decision: string;
  required_approver_role: string | null;
  priority: number;
  created_at: string;
};

export type RowCountSummary = {
  table_name: string;
  count: number;
};

export type InfrastructureSummary = {
  status: string;
  region: string;
  database: string;
  auth: string;
  consistency: string;
  isolation: string;
  checked_at: string;
  rowCounts: RowCountSummary[];
};

type ActionRow = Omit<ActionSummary, "proposed_changes" | "prior_state" | "gate"> & {
  proposed_changes: unknown;
  prior_state: unknown;
};

type GateAuditRow = {
  action_id: string;
  payload: unknown;
};

type EntityRow = Omit<EntitySnapshot, "state"> & {
  state: unknown;
};

type VersionRow = Omit<EntityVersionSummary, "state"> & {
  state: unknown;
};

type AuditEventRow = Omit<AuditRow, "payload"> & {
  payload: unknown;
};

type PolicyRuleRow = Omit<PolicyRuleSummary, "condition"> & {
  condition: unknown;
};

type CountRow = {
  count: number;
};

type HealthRow = {
  checked_at: string;
};

const countedTables = [
  "organizations",
  "users",
  "agents",
  "company_policies",
  "action_types",
  "business_entities",
  "entity_versions",
  "approval_rules",
  "action_proposals",
  "approvals",
  "executions",
  "rollback_events",
  "compensation_actions",
  "audit_events",
  "operation_traces",
] as const;

export async function getActions(limit = 50): Promise<ActionSummary[]> {
  const actions = await query<ActionRow>(
    `SELECT ap.id, ap.agent_id, ag.name AS agent_name, ap.entity_id,
       ap.action_type_key, ap.proposed_changes, ap.prior_state, ap.rationale,
       ap.evidence, ap.risk_level, ap.status, ap.reversibility_class,
       ap.idempotency_key, ap.created_at::text AS created_at
     FROM action_proposals ap
     JOIN agents ag ON ag.id = ap.agent_id
     WHERE ap.org_id = $1
     ORDER BY ap.created_at DESC
     LIMIT $2`,
    [DEMO_IDS.org, limit],
  );
  const gateAudits = await query<GateAuditRow>(
    `SELECT action_id, payload
     FROM audit_events
     WHERE org_id = $1
       AND event_type = 'gate_decided'
     ORDER BY created_at ASC`,
    [DEMO_IDS.org],
  );
  const gateByAction = new Map<string, JsonRecord>();

  for (const audit of gateAudits.rows) {
    gateByAction.set(audit.action_id, asJsonRecord(audit.payload));
  }

  return actions.rows.map((action) => ({
    ...action,
    proposed_changes: asJsonRecord(action.proposed_changes),
    prior_state: asJsonRecord(action.prior_state),
    gate: gateByAction.get(action.id) ?? {},
  }));
}

export async function getEntitySnapshot(): Promise<EntitySnapshot> {
  const result = await query<EntityRow>(
    `SELECT be.id, be.entity_type, be.external_ref, be.current_version_id,
       ev.version_number, ev.state
     FROM business_entities be
     JOIN entity_versions ev ON ev.id = be.current_version_id
     WHERE be.id = $1
     LIMIT 1`,
    [DEMO_IDS.entity],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("Demo entity not found");
  }

  return {
    ...row,
    state: asJsonRecord(row.state),
  };
}

export async function getEntityVersions(): Promise<EntityVersionSummary[]> {
  const result = await query<VersionRow>(
    `SELECT id, version_number, state, is_active, created_by_action_id,
       created_at::text AS created_at
     FROM entity_versions
     WHERE entity_id = $1
     ORDER BY version_number ASC, created_at ASC`,
    [DEMO_IDS.entity],
  );

  return result.rows.map((row) => ({
    ...row,
    state: asJsonRecord(row.state),
  }));
}

export async function getTraces(limit = 80): Promise<TraceRow[]> {
  const result = await query<TraceRow>(
    `SELECT id, action_id, operation, table_name, summary,
       created_at::text AS created_at
     FROM operation_traces
     WHERE org_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [DEMO_IDS.org, limit],
  );

  return result.rows.reverse();
}

export async function getAuditEvents(limit = 80): Promise<AuditRow[]> {
  const result = await query<AuditEventRow>(
    `SELECT id, action_id, event_type, payload, created_at::text AS created_at
     FROM audit_events
     WHERE org_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [DEMO_IDS.org, limit],
  );

  return result.rows.reverse().map((row) => ({
    ...row,
    payload: asJsonRecord(row.payload),
  }));
}

export async function getApprovalRules(): Promise<PolicyRuleSummary[]> {
  const result = await query<PolicyRuleRow>(
    `SELECT id, action_type_key, condition, decision, required_approver_role,
       priority, created_at::text AS created_at
     FROM approval_rules
     WHERE org_id = $1
     ORDER BY action_type_key ASC, priority ASC`,
    [DEMO_IDS.org],
  );

  return result.rows.map((row) => ({
    ...row,
    condition: asJsonRecord(row.condition),
  }));
}

export async function getInfrastructureData(): Promise<InfrastructureSummary> {
  const env = getDsqlEnv();
  const health = await query<HealthRow>("SELECT now()::text AS checked_at");
  const rowCounts = await Promise.all(
    countedTables.map(async (tableName) => {
      const result = await query<CountRow>(
        `SELECT count(*)::int AS count FROM ${tableName}`,
      );

      return {
        table_name: tableName,
        count: result.rows[0]?.count ?? 0,
      };
    }),
  );

  return {
    status: "connected",
    region: env.region,
    database: env.database,
    auth: "IAM token auth",
    consistency: "strong consistency",
    isolation: "snapshot isolation",
    checked_at: health.rows[0]?.checked_at ?? new Date().toISOString(),
    rowCounts,
  };
}

export async function getDashboardData() {
  const [actions, entity, versions, traces, auditEvents] = await Promise.all([
    getActions(),
    getEntitySnapshot(),
    getEntityVersions(),
    getTraces(),
    getAuditEvents(),
  ]);

  return {
    actions,
    entity,
    versions,
    traces,
    auditEvents,
  };
}
