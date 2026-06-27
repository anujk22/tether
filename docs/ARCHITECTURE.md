# Tether Architecture

```mermaid
flowchart LR
  agent["Scripted AI agent fixture"] --> sdk["Tether SDK / MCP boundary"]
  sdk --> gate["Deterministic policy gate"]
  gate --> approval{"Human approval required?"}
  approval -- "no, auto approve" --> execute["Execution service"]
  approval -- "yes" --> human["Finance / support / CSM approver"]
  human --> execute
  approval -- "deny" --> rejected["Rejected proposal"]
  execute --> connector["Simulated enterprise connector"]
  connector --> system["Simulated customer / payment system"]

  gate <--> dsql[("Aurora DSQL ledger")]
  human <--> dsql
  execute <--> dsql
  rejected --> dsql

  dsql --> versions["entity_versions: v4 -> v5 -> v6"]
  dsql --> traces["operation_traces: Flight Recorder"]
  dsql --> audit["audit_events"]
  dsql --> idem["unique idempotency key"]
  dsql --> rollback["rollback_events + compensation_actions"]

  rollback --> compensation["refund_reversal proposal"]
  compensation --> gate
```

## Built Scope

- Real: deterministic gate, approval lifecycle, execution, idempotency, versioned state, rollback, compensation, audit events, operation traces, and Aurora DSQL writes.
- Simulated: the AI agent and downstream enterprise/payment system.
- One action type flow: `issue_refund`, with `refund_reversal` as the compensation action.

## DSQL Design Notes

- UUID primary keys, no foreign keys.
- `json` columns, not `jsonb`.
- Every write transaction uses bounded retry for SQLSTATE `40001`.
- Concurrent proposal dedupe relies on the unique idempotency constraint/index and handles SQLSTATE `23505`.
- DSQL IAM auth uses `DsqlSigner.getDbConnectAdminAuthToken()` through an async `pg` password function so new connections receive fresh tokens.
- Mutations and their trace/audit rows are written atomically in the same transaction.
