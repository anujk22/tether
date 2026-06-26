import { query, transaction } from "./client";
import { withRetry } from "./retry";

type AsyncIndex = {
  name: string;
  sql: string;
};

type IndexStatus = {
  index_name: string;
  is_valid: boolean;
};

type JobResult = {
  job_id?: string;
};

const tableStatements = [
  {
    label: "organizations",
    sql: `CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "users",
    sql: `CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      name text,
      email text,
      role text,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "agents",
    sql: `CREATE TABLE IF NOT EXISTS agents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      name text,
      description text,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "company_policies",
    sql: `CREATE TABLE IF NOT EXISTS company_policies (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      title text,
      body_text text,
      structured_rules json,
      source text,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "action_types",
    sql: `CREATE TABLE IF NOT EXISTS action_types (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      key text,
      display_name text,
      reversibility_class text,
      compensation_template json
    )`,
  },
  {
    label: "business_entities",
    sql: `CREATE TABLE IF NOT EXISTS business_entities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      entity_type text,
      external_ref text,
      current_version_id uuid,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "entity_versions",
    sql: `CREATE TABLE IF NOT EXISTS entity_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      entity_id uuid,
      version_number int,
      state json,
      created_by_action_id uuid,
      is_active bool,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "approval_rules",
    sql: `CREATE TABLE IF NOT EXISTS approval_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      action_type_key text,
      condition json,
      decision text,
      required_approver_role text,
      priority int,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "action_proposals",
    sql: `CREATE TABLE IF NOT EXISTS action_proposals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      agent_id uuid,
      entity_id uuid,
      action_type_key text,
      proposed_changes json,
      prior_state json,
      rationale text,
      evidence json,
      risk_level text,
      status text,
      reversibility_class text,
      idempotency_key text CONSTRAINT ux_action_idem UNIQUE,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "approvals",
    sql: `CREATE TABLE IF NOT EXISTS approvals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      action_id uuid,
      approver_user_id uuid,
      decision text,
      note text,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "executions",
    sql: `CREATE TABLE IF NOT EXISTS executions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      action_id uuid,
      executed_at timestamptz,
      result text,
      produced_version_id uuid,
      error_text text
    )`,
  },
  {
    label: "rollback_events",
    sql: `CREATE TABLE IF NOT EXISTS rollback_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      action_id uuid,
      restored_version_id uuid,
      performed_by_user_id uuid,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "compensation_actions",
    sql: `CREATE TABLE IF NOT EXISTS compensation_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      origin_action_id uuid,
      compensation_action_id uuid,
      reason text,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "audit_events",
    sql: `CREATE TABLE IF NOT EXISTS audit_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      action_id uuid,
      event_type text,
      payload json,
      created_at timestamptz DEFAULT now()
    )`,
  },
  {
    label: "operation_traces",
    sql: `CREATE TABLE IF NOT EXISTS operation_traces (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      action_id uuid,
      operation text,
      table_name text,
      summary text,
      created_at timestamptz DEFAULT now()
    )`,
  },
] as const;

const asyncIndexes: AsyncIndex[] = [
  {
    name: "ux_action_idem",
    sql: "CREATE UNIQUE INDEX ASYNC IF NOT EXISTS ux_action_idem ON action_proposals (idempotency_key)",
  },
  {
    name: "ix_versions_entity",
    sql: "CREATE INDEX ASYNC IF NOT EXISTS ix_versions_entity ON entity_versions (entity_id)",
  },
  {
    name: "ix_traces_action",
    sql: "CREATE INDEX ASYNC IF NOT EXISTS ix_traces_action ON operation_traces (action_id)",
  },
];

async function runDdl(label: string, sql: string): Promise<JobResult | undefined> {
  const result = await withRetry(() =>
    transaction<JobResult | undefined>(async (client) => {
      const ddlResult = await client.query<JobResult>(sql);
      return ddlResult.rows[0];
    }),
  );

  console.log(`ddl:${label}`);
  return result;
}

async function findIndex(name: string): Promise<IndexStatus | undefined> {
  const result = await query<IndexStatus>(
    `SELECT c.relname AS index_name, i.indisvalid AS is_valid
     FROM pg_index i
     JOIN pg_class c ON c.oid = i.indexrelid
     WHERE c.relname = $1`,
    [name],
  );

  return result.rows[0];
}

async function waitForAsyncJob(jobId: string): Promise<void> {
  await query("CALL sys.wait_for_job($1::text)", [jobId]);
}

async function ensureIndex(index: AsyncIndex): Promise<void> {
  const existing = await findIndex(index.name);

  if (existing?.is_valid) {
    console.log(`index:${index.name}:ready`);
    return;
  }

  const result = await runDdl(index.name, index.sql);
  const jobId = result?.job_id;

  if (jobId) {
    await waitForAsyncJob(jobId);
  }

  const created = await findIndex(index.name);

  if (!created?.is_valid) {
    throw new Error(`Index ${index.name} is not valid after migration`);
  }

  console.log(`index:${index.name}:ready`);
}

export async function migrate(): Promise<void> {
  for (const statement of tableStatements) {
    await runDdl(statement.label, statement.sql);
  }

  for (const index of asyncIndexes) {
    await ensureIndex(index);
  }
}
