import { writeTransaction, type DbClient } from "../db/client";
import { insertAuditEvent, insertTrace } from "../db/trace";
import type { ActionStatus, UserRole } from "../domain/types";
import { DEMO_IDS } from "../demo/ids";
import { executeApprovedAction, type ActionRow, type ExecuteResult } from "./execute";
import { asJsonRecord } from "./json";

export type DecideActionInput = {
  decision: "approve" | "reject";
  note?: string;
  approver_user_id?: string;
  acting_role?: UserRole;
};

export type DecideActionResult = {
  action_id: string;
  status: ActionStatus;
  execution: ExecuteResult | null;
};

function defaultApprover(decision: "approve" | "reject"): string {
  if (decision === "approve") return DEMO_IDS.users.finance;
  return DEMO_IDS.users.supportLead;
}

type UserRoleRow = {
  role: UserRole;
};

type GateAuditRow = {
  payload: unknown;
};

function roleLabel(role: string): string {
  return role.replaceAll("_", " ");
}

async function loadUserRole(
  client: DbClient,
  userId: string,
): Promise<UserRole | null> {
  const result = await client.query<UserRoleRow>(
    "SELECT role FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );

  return result.rows[0]?.role ?? null;
}

async function loadRequiredApproverRole(
  client: DbClient,
  actionId: string,
): Promise<UserRole | null> {
  const result = await client.query<GateAuditRow>(
    `SELECT payload
     FROM audit_events
     WHERE action_id = $1
       AND event_type = 'gate_decided'
     ORDER BY created_at DESC
     LIMIT 1`,
    [actionId],
  );
  const payload = asJsonRecord(result.rows[0]?.payload);
  const requiredRole = payload.required_approver_role;

  return typeof requiredRole === "string" ? (requiredRole as UserRole) : null;
}

export async function decideAction(
  actionId: string,
  input: DecideActionInput,
): Promise<DecideActionResult> {
  if (input.decision !== "approve" && input.decision !== "reject") {
    throw new Error("decision must be approve or reject");
  }

  return writeTransaction(async (client) => {
    const loaded = await client.query<ActionRow>(
      `SELECT id, org_id, agent_id, entity_id, action_type_key, proposed_changes,
         prior_state, status, reversibility_class
       FROM action_proposals
       WHERE id = $1
       LIMIT 1`,
      [actionId],
    );
    const action = loaded.rows[0];

    if (!action) {
      throw new Error("Action not found");
    }

    if (action.status === "executed") {
      return {
        action_id: actionId,
        status: "executed",
        execution: await executeApprovedAction(client, {
          ...action,
          status: "executed",
        }),
      };
    }

    if (action.status !== "approval_required") {
      throw new Error(`Action cannot be decided from status ${action.status}`);
    }

    const approverUserId = input.approver_user_id ?? defaultApprover(input.decision);
    const actingRole = input.acting_role ?? (await loadUserRole(client, approverUserId));
    const requiredRole = await loadRequiredApproverRole(client, action.id);

    if (
      input.decision === "approve" &&
      requiredRole &&
      actingRole !== requiredRole
    ) {
      throw new Error(
        `Action requires ${roleLabel(requiredRole)} approval; acting role is ${
          actingRole ? roleLabel(actingRole) : "unknown"
        }.`,
      );
    }

    await client.query(
      `INSERT INTO approvals
        (org_id, action_id, approver_user_id, decision, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        action.org_id,
        action.id,
        approverUserId,
        input.decision,
        input.note ?? null,
      ],
    );
    await insertTrace(client, {
      orgId: action.org_id,
      actionId: action.id,
      operation: "INSERT",
      tableName: "approvals",
      summary: `Recorded ${input.decision} decision.`,
    });

    const nextStatus: ActionStatus =
      input.decision === "approve" ? "approved" : "rejected";

    await client.query("UPDATE action_proposals SET status = $1 WHERE id = $2", [
      nextStatus,
      action.id,
    ]);
    await insertTrace(client, {
      orgId: action.org_id,
      actionId: action.id,
      operation: "UPDATE",
      tableName: "action_proposals",
      summary: `Marked action as ${nextStatus}.`,
    });
    await insertAuditEvent(client, {
      orgId: action.org_id,
      actionId: action.id,
      eventType: "decision_recorded",
      payload: {
        decision: input.decision,
        note: input.note ?? null,
        approver_user_id: approverUserId,
        acting_role: actingRole,
        required_approver_role: requiredRole,
      },
    });

    if (input.decision === "reject") {
      return {
        action_id: action.id,
        status: "rejected",
        execution: null,
      };
    }

    const execution = await executeApprovedAction(client, {
      ...action,
      status: "approved",
    });

    return {
      action_id: action.id,
      status: execution.status,
      execution,
    };
  });
}
