# Demo Script

Target length: under 3 minutes.

## 0:00-0:20 Problem

AI agents are moving from text generation to business actions. A log file is not enough once an agent can issue refunds or change customer state. Tether is the undo button for AI agents: a transactional safety layer on Aurora DSQL.

## 0:20-0:40 Product At Rest

Show the four panels: Agent Intake, Policy Gate, Decision, and DSQL Flight Recorder. State the split clearly: the agent and downstream system are simulated; the control plane internals are real.

## 0:40-1:20 Gate And Approval

Select the $1,250 `issue_refund` action. Show the cited refund policy, before/after diff, required finance role, and real trace rows. Approve the refund. Call out that Tether appends a new version and records the execution exactly once.

## 1:20-2:05 Rollback Peak

Say: "Suppose the agent was wrong." Click Rollback. Show v5 dimming conceptually and v6 restoring v4's internal state. Explain the boundary: exact rollback for internal state; compensation for irreversible external effects. Show the `refund_reversal` compensation action.

## 2:05-2:35 Architecture And Retry Proof

Show `docs/ARCHITECTURE.md` or a rendered Mermaid diagram. Explain that Aurora DSQL is the ledger of record. Click Simulate retry x3. State that three concurrent attempts share one idempotency key and collapse to one proposal and one execution.

## 2:35-3:00 Close

Every action approved, auditable, and reversible. Tether is the trust layer for AI agents that act.
