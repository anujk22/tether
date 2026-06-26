import { closeDbPool, query, writeTransaction } from "../src/lib/db/client";
import { insertAuditEvent, insertTrace } from "../src/lib/db/trace";
import { DEMO_IDS } from "../src/lib/demo/ids";
import { withRetry, type SqlStateError } from "../src/lib/db/retry";

type CountRow = {
  count: number;
};

type VersionRow = {
  version_number: number;
  is_active: boolean;
  refund_status: string;
};

async function assertRetryHelper(): Promise<void> {
  let attempts = 0;

  await withRetry(
    async () => {
      attempts += 1;

      if (attempts === 1) {
        const error = new Error("simulated serialization failure") as SqlStateError;
        error.code = "40001";
        throw error;
      }
    },
    { baseDelayMs: 1 },
  );

  if (attempts !== 2) {
    throw new Error("Retry helper did not retry exactly once");
  }
}

async function assertSeedBaseline(): Promise<void> {
  const [orgs, users, actionTypes, rules] = await Promise.all([
    query<CountRow>("SELECT count(*)::int AS count FROM organizations"),
    query<CountRow>("SELECT count(*)::int AS count FROM users"),
    query<CountRow>("SELECT count(*)::int AS count FROM action_types"),
    query<CountRow>("SELECT count(*)::int AS count FROM approval_rules"),
  ]);

  const seededVersion = await query<VersionRow>(
    `SELECT version_number, is_active, state->>'refund_status' AS refund_status
     FROM entity_versions
     WHERE id = $1`,
    [DEMO_IDS.entityVersionV4],
  );
  const currentVersion = await query<VersionRow>(
    `SELECT ev.version_number, ev.is_active, ev.state->>'refund_status' AS refund_status
     FROM business_entities be
     JOIN entity_versions ev ON ev.id = be.current_version_id
     WHERE be.id = $1`,
    [DEMO_IDS.entity],
  );

  const v4 = seededVersion.rows[0];
  const current = currentVersion.rows[0];

  if (
    orgs.rows[0]?.count < 1 ||
    users.rows[0]?.count < 3 ||
    actionTypes.rows[0]?.count < 2 ||
    rules.rows[0]?.count < 5 ||
    v4?.version_number !== 4 ||
    v4.refund_status !== "none" ||
    !current?.is_active ||
    current.version_number < 4
  ) {
    throw new Error("Seed baseline is incomplete");
  }
}

async function assertTransactionalWrite(): Promise<void> {
  await writeTransaction(async (client) => {
    await insertAuditEvent(client, {
      orgId: DEMO_IDS.org,
      actionId: null,
      eventType: "foundation_smoke_check",
      payload: {
        source: "db-smoke",
        checked_at: new Date().toISOString(),
      },
    });

    await insertTrace(client, {
      orgId: DEMO_IDS.org,
      actionId: null,
      operation: "INSERT",
      tableName: "audit_events",
      summary: "Foundation smoke inserted an audit event.",
    });
  });

  const result = await query<CountRow>(
    `SELECT count(*)::int AS count
     FROM operation_traces
     WHERE org_id = $1
       AND table_name = 'audit_events'
       AND summary = 'Foundation smoke inserted an audit event.'`,
    [DEMO_IDS.org],
  );

  if (!result.rows[0]?.count) {
    throw new Error("Smoke trace was not written");
  }
}

async function main(): Promise<void> {
  try {
    await query("SELECT 1");
    await assertSeedBaseline();
    await assertRetryHelper();
    await assertTransactionalWrite();
    console.log("db:smoke:ok");
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
