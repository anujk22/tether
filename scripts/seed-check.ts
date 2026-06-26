import { closeDbPool, query } from "../src/lib/db/client";
import { DEMO_IDS } from "../src/lib/demo/ids";

type CountRow = {
  count: number;
};

type VersionRow = {
  version_number: number;
  refund_status: string;
};

async function count(tableName: string): Promise<number> {
  const result = await query<CountRow>(`SELECT count(*)::int AS count FROM ${tableName}`);
  return result.rows[0]?.count ?? 0;
}

async function main(): Promise<void> {
  try {
    const [orgs, users, agents, actionTypes, approvalRules] = await Promise.all([
      count("organizations"),
      count("users"),
      count("agents"),
      count("action_types"),
      count("approval_rules"),
    ]);

    const version = await query<VersionRow>(
      `SELECT version_number, is_active, state->>'refund_status' AS refund_status
       FROM entity_versions
       WHERE id = $1`,
      [DEMO_IDS.entityVersionV4],
    );

    const v4 = version.rows[0];

    if (
      orgs < 1 ||
      users < 3 ||
      agents < 1 ||
      actionTypes < 2 ||
      approvalRules < 5 ||
      v4?.version_number !== 4 ||
      v4.refund_status !== "none"
    ) {
      throw new Error("Seed verification failed");
    }

    console.log(
      `seed:verified orgs=${orgs} users=${users} action_types=${actionTypes} rules=${approvalRules}`,
    );
  } finally {
    await closeDbPool();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
