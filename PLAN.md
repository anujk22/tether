# Tether Build Plan

This plan implements the PRD for Tether: a design-led control plane for AI agents that act, backed by Aurora DSQL. It is written as the handoff contract for any future agent resuming the build.

## Confirmed Assumptions

- AWS region: `us-east-1`.
- Aurora DSQL cluster is user-created; Codex owns schema, migrations, seed data, and app code.
- DSQL connection: host from `.env.local`, user `admin`, database `postgres`, port `5432`, SSL enabled.
- Auth: IAM token auth through AWS's official node connector packages; no hand-rolled long-lived database password.
- AWS credentials come from the standard provider chain and are also stored locally in `.env.local` for this hackathon workspace.
- Agent behavior is scripted and deterministic. No live model dependency is required.
- Real internals: gate, versioning, rollback, compensation, idempotency, traces, audit, and DSQL writes.
- Simulated parts: the AI agent and downstream enterprise/payment systems.
- Scope: one action type only, `issue_refund`.
- Package manager: `pnpm`.
- Frontend design has full creative latitude but must obey PRD Part 2.
- Vercel deployment and team ID are Phase 7 and should not block earlier phases.

## Global DSQL Constraints

- Use UUID primary keys, never sequences or `SERIAL`.
- Use `json`, not `jsonb`.
- Do not create foreign keys, triggers, PL/pgSQL, temp tables, or extensions.
- Treat relationships as logical UUID references validated in application code.
- Wrap every write transaction in a bounded retry loop for SQLSTATE `40001`.
- Do not rely on `FOR UPDATE` for locking.
- Run each DDL statement in its own transaction.
- Do not mix DDL and DML in the same transaction.
- Use `CREATE INDEX ASYNC` for indexes and verify index readiness before relying on them.
- Keep mutations small and append-only wherever possible.

## Phase 1 - Foundation

Goal: Create the Next.js foundation, DSQL connection layer, migrations, and seed data.

- [ ] 1.1 Scaffold the app
  - Files: Next.js app files, `package.json`, `pnpm-lock.yaml`, `.gitignore`, TypeScript/Tailwind config.
  - Tasks: Create a Next.js App Router + TypeScript + Tailwind v4 app in the workspace.
  - Libraries: Next.js, React, Tailwind CSS v4, ESLint.
  - Verify: `pnpm lint` succeeds on the scaffold.

- [ ] 1.2 Add local environment handling
  - Files: `.env.local`, `.env.example`, `.gitignore`.
  - Tasks: Store DSQL host, region, database, user, port, SSL mode, and AWS credential names locally; ensure `.env.local` is ignored.
  - Libraries: Next.js env loading for app runtime; `@next/env` or equivalent for scripts if needed.
  - Verify: scripts can load required env vars without printing secrets.

- [ ] 1.3 Install database dependencies
  - Files: `package.json`, `pnpm-lock.yaml`.
  - Tasks: Install `pg`, `@aws/aurora-dsql-nodejs-connector`, `@aws-sdk/credential-providers`, `@aws-sdk/dsql-signer`.
  - Verify: dependency install completes and TypeScript can resolve database packages.

- [ ] 1.4 Implement DSQL-safe connection and retry layer
  - Files: `src/lib/db/env.ts`, `src/lib/db/client.ts`, `src/lib/db/retry.ts`, `src/lib/db/trace.ts`.
  - Tasks: Build a `pg` pool using the official Aurora DSQL connector/IAM token auth, load env safely, expose `query`, `transaction`, and `withRetry` helpers, catch SQLSTATE `40001` with bounded exponential backoff.
  - Verify: a local script can open and close a database connection; retry helper has a focused test or script check.

- [ ] 1.5 Add DSQL-safe migrations
  - Files: `src/lib/db/migrations.ts`, `scripts/migrate.ts`.
  - Tasks: Create all PRD schema tables using `json` columns, UUID PK defaults, and no foreign keys; run each DDL statement in its own transaction; create required async indexes in their own transactions; verify async indexes before reporting success.
  - Verify: `pnpm db:migrate` creates the schema against DSQL without unsupported syntax.

- [ ] 1.6 Seed demo data
  - Files: `src/lib/demo/seed.ts`, `scripts/seed.ts`.
  - Tasks: Insert one org, three users, one agent, policy/rules, `issue_refund` action type, one customer business entity, and active `entity_versions` v4 state.
  - Verify: `pnpm db:seed` is idempotent enough for local iteration and leaves exactly the expected demo entities.

- [ ] 1.7 Add foundation verification scripts
  - Files: `scripts/db-smoke.ts`, `package.json`.
  - Tasks: Add a smoke check that connects to DSQL, confirms seeded rows, performs a tiny trace/audit-safe test write if appropriate, and exercises retry wrapper behavior without forcing a real conflict.
  - Verify: `pnpm db:smoke` prints a concise success summary.

- [ ] 1.8 Commit Phase 1 foundation
  - Files: git history.
  - Tasks: Commit small units using messages mapped to plan tasks.
  - Verify: `git log --oneline` shows Phase 1 commits and `git status --short` is clean except intentional local secrets.

Phase 1 Definition of Done: app boots, DSQL connection works, migrations and seed data exist in the cluster, and retry-safe write infrastructure is in place.

## Phase 2 - Propose + Gate

Goal: Implement scripted proposal creation and deterministic gating.

- [ ] 2.1 Create shared domain types and constants for statuses, decisions, roles, and reversibility classes.
- [ ] 2.2 Implement deterministic condition evaluation for `approval_rules` ordered by priority.
- [ ] 2.3 Implement `POST /v1/actions/propose`.
- [ ] 2.4 Ensure idempotency key dedupe returns existing proposal before mutation.
- [ ] 2.5 Snapshot active prior state, insert proposal, gate it, and write audit/trace rows for every mutation.
- [ ] 2.6 Add scripted `$1,250` `issue_refund` proposal fixture.
- [ ] 2.7 Verify scripted proposal lands as `approval_required` with finance as required approver and real traces.

Phase 2 Definition of Done: the scripted proposal writes to DSQL, gates deterministically, and records trace/audit rows from real database state.

## Phase 3 - Approve + Execute

Goal: Human decision moves approved actions into versioned business state.

- [ ] 3.1 Implement `POST /v1/actions/{id}/decision` for approve/reject.
- [ ] 3.2 Implement idempotent internal execute path guarded by action status.
- [ ] 3.3 Append `entity_versions` v5, deactivate the prior active version, and update `business_entities.current_version_id`.
- [ ] 3.4 Write `approvals`, `executions`, `audit_events`, and `operation_traces`.
- [ ] 3.5 Verify approving moves seeded state v4 to v5 in DSQL.

Phase 3 Definition of Done: approving the proposal produces exactly one execution and one new active version.

## Phase 4 - Rollback + Compensation

Goal: Make rollback the moat: exact internal restore plus routed external compensation.

- [ ] 4.1 Implement `POST /v1/actions/{id}/rollback`.
- [ ] 4.2 For `REVERSIBLE_INTERNAL`, append a restoring version and rollback event.
- [ ] 4.3 For `IRREVERSIBLE_EXTERNAL`, append v6 that restores internal state from prior v4 and create a compensation proposal from the template.
- [ ] 4.4 Route the compensation proposal through the same propose/gate path.
- [ ] 4.5 Write all rollback/compensation traces and audit rows.
- [ ] 4.6 Verify rollback yields v6 = v4 internal state and a routed compensation action in DSQL.

Phase 4 Definition of Done: rollback restores internal state and spawns a compensation proposal without any fake control-plane internals.

## Phase 5 - Proof + Recorder

Goal: Make DSQL correctness visible in the product.

- [ ] 5.1 Implement read APIs for actions, active entity state, audit events, and `operation_traces`.
- [ ] 5.2 Build Flight Recorder data source from real `operation_traces` rows.
- [ ] 5.3 Implement Retry x3 endpoint or client flow that fires three concurrent propose calls with one idempotency key.
- [ ] 5.4 Verify Retry x3 yields one proposal, one execution after approval, and zero double refunds.

Phase 5 Definition of Done: Flight Recorder is live from DSQL, and the retry proof visibly dedupes.

## Phase 6 - Frontend Excellence

Goal: Build the four-panel control surface with the design bar from PRD Part 2.

- [ ] 6.1 Create `DESIGN.md` before UI implementation.
  - Include 5-7 named hex colors with roles.
  - Include display/body/mono type choices.
  - Include ASCII wireframes for the four panels.
  - Include the signature visual element and a critique against AI-default dashboard looks.
- [ ] 6.2 Implement the four panels: Agent Intake, Policy Gate, Decision, DSQL Flight Recorder.
- [ ] 6.3 Apply state-driven semantic palette consistently across timeline, pills, trace rows, and diffs.
- [ ] 6.4 Add orchestrated state-machine motion, gate-slam, rollback rewind, recorder stream, and retry merge.
- [ ] 6.5 Add accessible focus states, reduced-motion behavior, loading, empty, and error states.
- [ ] 6.6 QA desktop and mobile with screenshots and fix layout/text overlap issues.
- [ ] 6.7 Complete the PRD Part 2.10 anti-generic checklist.

Phase 6 Definition of Done: the app looks like a bespoke control surface, not a generic SaaS template, and all key flows are usable.

## Phase 7 - Ship

Goal: Prepare hackathon submission artifacts.

- [ ] 7.1 Deploy to Vercel after Team ID/project details are provided.
- [ ] 7.2 Capture DSQL proof screenshot from AWS/Vercel context.
- [ ] 7.3 Create architecture diagram showing agent -> Tether SDK/MCP -> gate -> approval -> connector -> enterprise system, with Aurora DSQL as ledger.
- [ ] 7.4 Write Devpost description using the PRD paragraph and implementation specifics.
- [ ] 7.5 Record the sub-3-minute demo video with rollback as the peak and DSQL explicitly explained.
- [ ] 7.6 Complete submission checklist for Track 2.

Phase 7 Definition of Done: deployed app, artifacts, and submission checklist are complete.

## Overall Definition of Done

- [ ] One `issue_refund` action flows proposed -> gated -> approved -> executed with real DB writes.
- [ ] Entity state visibly versions v4 -> v5 on execute.
- [ ] Rollback restores v5 -> v6 = v4 and spawns routed compensation.
- [ ] Flight Recorder reads real `operation_traces`, not hardcoded text.
- [ ] Retry x3 proves one-proposal/one-execution dedupe.
- [ ] All writes handle SQLSTATE `40001` retries.
- [ ] All JSON columns are `json`; all PKs are UUID; there are zero foreign keys.
- [ ] Frontend passes PRD Part 2 anti-generic checklist.
- [ ] App is deployed on Vercel.
- [ ] DSQL screenshot and architecture diagram are captured.
- [ ] Demo video is under 3 minutes with rollback and DSQL explanation.
- [ ] Submission is posted under Track 2.
