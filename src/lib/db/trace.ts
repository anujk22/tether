import type { DbClient } from "./client";

export type TraceInput = {
  orgId: string;
  actionId?: string | null;
  operation: "INSERT" | "UPDATE" | "DELETE";
  tableName: string;
  summary: string;
};

export type AuditInput = {
  orgId: string;
  actionId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
};

export async function insertTrace(
  client: DbClient,
  input: TraceInput,
): Promise<void> {
  await client.query(
    `INSERT INTO operation_traces
      (org_id, action_id, operation, table_name, summary)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.orgId,
      input.actionId ?? null,
      input.operation,
      input.tableName,
      input.summary,
    ],
  );
}

export async function insertAuditEvent(
  client: DbClient,
  input: AuditInput,
): Promise<void> {
  await client.query(
    `INSERT INTO audit_events
      (org_id, action_id, event_type, payload)
     VALUES ($1, $2, $3, $4::json)`,
    [
      input.orgId,
      input.actionId ?? null,
      input.eventType,
      JSON.stringify(input.payload),
    ],
  );
}
