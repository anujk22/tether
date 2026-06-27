import type { PoolClient } from "pg";

import { writeTransaction } from "../db/client";
import { createProposalInTransaction } from "../tether/propose";
import { DEMO_IDS } from "./ids";
import { BASE_ENTITY_STATE, seedDemoData } from "./seed";
import { scriptedRefundProposal } from "./scripted-proposal";

async function clearGeneratedDemoState(client: PoolClient): Promise<void> {
  const orgParams = [DEMO_IDS.org];

  await client.query("DELETE FROM approvals WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM executions WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM rollback_events WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM compensation_actions WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM audit_events WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM operation_traces WHERE org_id = $1", orgParams);
  await client.query("DELETE FROM action_proposals WHERE org_id = $1", orgParams);

  await client.query(
    `DELETE FROM entity_versions
     WHERE entity_id = $1
       AND id <> $2`,
    [DEMO_IDS.entity, DEMO_IDS.entityVersionV4],
  );
  await client.query(
    `UPDATE entity_versions
     SET state = $1::json,
       created_by_action_id = NULL,
       is_active = true
     WHERE id = $2`,
    [JSON.stringify(BASE_ENTITY_STATE), DEMO_IDS.entityVersionV4],
  );
  await client.query(
    `UPDATE business_entities
     SET current_version_id = $1
     WHERE id = $2`,
    [DEMO_IDS.entityVersionV4, DEMO_IDS.entity],
  );
}

export async function resetDemoData() {
  await seedDemoData();

  return writeTransaction(async (client) => {
    await clearGeneratedDemoState(client);
    return createProposalInTransaction(client, scriptedRefundProposal());
  });
}
