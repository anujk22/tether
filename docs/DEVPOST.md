# Devpost Copy

## First Paragraph

Tether is the control plane for AI agents that act. When an agent proposes a state-changing action, refunding a customer, updating a record, escalating a case, or triggering an external workflow, Tether gates it, records it, routes risky actions for approval, executes it exactly once, and reverses mistakes through versioned rollback or compensating actions. Built on Aurora DSQL, Tether uses an append-only action ledger, retry-safe idempotency keys, and versioned business state so agent actions are approved, auditable, and reversible.

## What It Does

Tether turns AI actions into governed transactions. In the demo, a scripted support agent proposes a $1,250 refund for customer `cust_8841`. Tether snapshots the current customer state, evaluates deterministic approval rules from DSQL, routes the action to finance, records approval, appends a new entity version, and writes a Flight Recorder stream from real `operation_traces` rows. When the action is rolled back, Tether restores the prior internal state as a new version and creates a routed `refund_reversal` compensation action for the simulated external payment effect.

## How Aurora DSQL Is Used

Aurora DSQL is the ledger of record for the control plane. Tether stores action proposals, approval decisions, versioned entity state, executions, rollback events, compensation links, audit events, and operation traces in DSQL. Strong consistency matters because the action path is incorrect if two concurrent agent retries can create two refunds. Tether uses a unique idempotency key, OCC retries for SQLSTATE `40001`, and duplicate-key handling for SQLSTATE `23505` to make the Retry x3 proof collapse into one proposal and one execution.

## What Is Real vs Simulated

Real: gate, approval, execution lifecycle, version append, rollback, compensation routing, idempotency, audit, traces, and DSQL writes.

Simulated: the AI agent and downstream payment/customer systems.

## Built With

- Next.js App Router, TypeScript, Tailwind CSS v4.
- Aurora DSQL through `pg` and `@aws-sdk/dsql-signer`.
- TanStack Query for live polling.
- Motion and lucide-react for stateful interaction and controls.
