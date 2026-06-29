# Tether Progress

## 2026-06-26 - Session Start

Completed:

- Read the full attached master PRD/build contract.
- Asked the required consolidated clarifying questions before planning.
- Received corrections and concrete answers:
  - No DSQL steering skill/MCP install; enforce DSQL constraints manually.
  - Use AWS official Aurora DSQL node connector packages for IAM token auth.
  - Agent is scripted; no live model dependency.
  - Real internals are gate, versioning, rollback, compensation, idempotency, and DSQL writes.
  - Simulated parts are the agent and downstream enterprise/payment system.
  - Target DSQL region is `us-east-1`; user-created cluster endpoint is available.
  - Fresh Next.js App Router + TypeScript + Tailwind v4 app should be initialized here.
  - Use `pnpm`.
  - Run local commits; push later when a remote is provided.

Decisions:

- Keep `.env.local` local and ignored; do not print secrets in scripts or final output.
- Start with Phase 1 only: foundation, connection layer, migrations, seed, smoke verification.
- Treat Vercel deployment details as Phase 7 and non-blocking for earlier phases.

Current state:

- Workspace path: `/Users/anuj/Documents/Coding/Hackathons/AWS Hackathon`.
- A `.git` directory already exists, so the repo is initialized.
- No application files existed before this plan/progress handoff.

How to verify:

- Inspect this file and `PLAN.md`.
- Run `git status --short` to see the current working tree.

Next action:

- Wait for user confirmation on the plan before scaffolding or writing app code.

## 2026-06-26 - Paused Before Implementation

Completed:

- Created `PLAN.md` and `PROGRESS.md`.
- Committed the planning checkpoint locally.
- Removed the uncommitted Next.js scaffold that was generated before user confirmation.

Decision:

- Do not scaffold, code, install dependencies, migrate, seed, or otherwise implement until the user explicitly confirms the plan.

Current state:

- Workspace contains only the planning/progress docs plus git metadata.
- No application scaffold or code is present.

How to verify:

- Run `git status --short`; only this progress-doc update should appear until committed.

Next action:

- Wait for user confirmation to begin Phase 1.

## 2026-06-26 - Plan Approved With Corrections

Completed:

- Read the approved-build adjustment file.
- Applied required corrections to `PLAN.md` before implementation.

Decisions:

- Use `@aws-sdk/dsql-signer` plus `pg` as the primary DSQL connection path.
- Generate IAM auth tokens through an async `password` function per new connection; do not generate a single pool-startup token.
- Catch SQLSTATE `40001` for bounded OCC retries and SQLSTATE `23505` for idempotency races.
- Keep execute and rollback mutations plus their trace/audit rows inside one transaction.
- Seed a stable `refund_reversal` compensation action type in addition to `issue_refund`.
- Make migrations and seed scripts re-runnable with fixed seed UUIDs.
- Use polling for the Flight Recorder so the UI visibly refreshes from DSQL.

Current state:

- `PLAN.md` has been updated with the approved corrections.
- App implementation has not started yet in this resumed session.

How to verify:

- Inspect `PLAN.md` sections for DSQL auth, idempotency, atomic transactions, compensation seed data, and live recorder polling.

Next action:

- Commit the plan/progress correction, then begin Phase 1.1 scaffolding.

## 2026-06-26 - Phase 1.1 Scaffold

Completed:

- Scaffolded a Next.js App Router + TypeScript + Tailwind v4 project.
- Moved generated files into the repo root because the workspace folder name is not a valid npm package name.
- Made pnpm installs noninteractive by explicitly rejecting optional build scripts for `sharp` and `unrs-resolver` in `pnpm-workspace.yaml`.
- Verified the scaffold with `pnpm lint`.
- Marked Phase 1.1 complete in `PLAN.md`.

Decisions:

- Keep the generated package name as `tether-app`.
- Leave optional build scripts disabled unless a later dependency requires them; current lint verification passes.

Current state:

- Next.js scaffold is present in the repo root.
- Dependencies are installed locally under ignored `node_modules`.

How to verify:

- Run `pnpm install`.
- Run `pnpm lint`.

Next action:

- Commit Phase 1.1, then add local environment handling for DSQL and AWS credentials.

## 2026-06-26 - Phase 1.2 Environment

Completed:

- Added `.env.example` with non-secret DSQL/AWS variable names and defaults.
- Created ignored `.env.local` with the provided local AWS and DSQL settings.
- Updated `.gitignore` so `.env.local` remains ignored while `.env.example` can be committed.
- Verified required env vars load with Node without printing credential values.
- Marked Phase 1.2 complete in `PLAN.md`.

Decisions:

- Keep all app/server database config behind non-public env vars.
- Commit `.env.example`, not `.env.local`.

Current state:

- `.env.local` exists locally and is ignored.
- `.env.example` and `.gitignore` are modified for commit.

How to verify:

- Run `git check-ignore -v .env.local`.
- Run `node --env-file=.env.local -e 'console.log(Boolean(process.env.DSQL_HOST))'`.

Next action:

- Commit Phase 1.2, then install database dependencies.

## 2026-06-26 - Phase 1.3 Database Dependencies

Completed:

- Installed `pg`, `@aws-sdk/credential-providers`, and `@aws-sdk/dsql-signer`.
- Added `tsx` and `@types/pg` for TypeScript database scripts.
- Approved only the `esbuild` build script needed by `tsx`; left optional `sharp` and `unrs-resolver` scripts disabled.
- Verified dependencies with `pnpm exec tsc --noEmit` and `pnpm lint`.
- Marked Phase 1.3 complete in `PLAN.md`.

Decisions:

- Use the canonical manual `DsqlSigner` + `pg` path, not an unverified convenience connector.

Current state:

- Database packages are installed and repeatable via `pnpm install`.

How to verify:

- Run `pnpm exec tsc --noEmit`.
- Run `pnpm lint`.

Next action:

- Commit Phase 1.3, then implement the DSQL-safe connection and retry layer.

## 2026-06-26 - Phase 1.4 DSQL Connection And Retry

Completed:

- Implemented env validation in `src/lib/db/env.ts`.
- Implemented the DSQL `pg` pool in `src/lib/db/client.ts` using `DsqlSigner.getDbConnectAdminAuthToken()` as an async `password` function.
- Added `query`, `transaction`, `writeTransaction`, and pool shutdown helpers.
- Implemented `withRetry` for SQLSTATE `40001` and explicit SQLSTATE helpers for `23505`.
- Added trace/audit insert helpers for later business mutations.
- Added `pnpm db:retry-check` and verified retry behavior locally.
- Added `pnpm db:connect` and verified a live DSQL `SELECT 1`.
- Verified with `pnpm exec tsc --noEmit` and `pnpm lint`.
- Marked Phase 1.4 complete in `PLAN.md`.

Decisions:

- Use `node --env-file-if-exists=.env.local --import tsx` for local database scripts so Vercel-style env injection still works elsewhere.
- Keep the pool small with `max` defaulting to 3 for serverless-friendly behavior.

Current state:

- The app can connect to the provided Aurora DSQL cluster.
- Retry logic distinguishes `40001` retries from `23505` duplicate-key handling.

How to verify:

- Run `pnpm db:retry-check`.
- Run `pnpm db:connect`.
- Run `pnpm exec tsc --noEmit`.
- Run `pnpm lint`.

Next action:

- Commit Phase 1.4, then implement DSQL-safe migrations.

## 2026-06-26 - Phase 1.5 Migrations

Completed:

- Added DSQL-safe migration statements for all PRD schema tables.
- Used `CREATE TABLE IF NOT EXISTS`, UUID PK defaults, `json` columns, and no foreign keys.
- Added inline unique constraint for `action_proposals.idempotency_key` and async index fallback/validation for `ux_action_idem`.
- Added async indexes for `entity_versions(entity_id)` and `operation_traces(action_id)`.
- Ran every DDL statement in its own transaction.
- Verified async index readiness through DSQL job waiting and `pg_index.indisvalid`.
- Added `pnpm db:migrate`.
- Ran `pnpm db:migrate` successfully twice to prove re-runnability.
- Verified with `pnpm exec tsc --noEmit` and `pnpm lint`.
- Marked Phase 1.5 complete in `PLAN.md`.

Decisions:

- DSQL exposes `sys.wait_for_job` as a procedure, so migration uses `CALL sys.wait_for_job(...)` instead of `SELECT sys.wait_for_job(...)`.
- Keep index validation through PostgreSQL catalog rows after the async job returns.

Current state:

- The live DSQL cluster has all schema tables and required indexes.
- Migrations are idempotent for resumed sessions.

How to verify:

- Run `pnpm db:migrate`; it should finish with `migrate:ok`.

Next action:

- Commit Phase 1.5, then add fixed-UUID seed data including `issue_refund` and `refund_reversal`.

## 2026-06-26 - Phase 1.6 Seed Data

Completed:

- Added fixed seed UUIDs in `src/lib/demo/ids.ts`.
- Added re-runnable seed logic in `src/lib/demo/seed.ts`.
- Seeded one organization, three users, one agent, one company policy, two action types, five approval rules, one customer entity, and active entity version v4.
- Seeded `issue_refund` as `IRREVERSIBLE_EXTERNAL` with a `refund_reversal` compensation template.
- Seeded `refund_reversal` with an auto-approve rule and no compensation template to avoid recursive compensation.
- Added `pnpm db:seed` and `pnpm db:seed-check`.
- Ran `pnpm db:seed` twice successfully.
- Verified seeded data with `pnpm db:seed-check`.
- Verified with `pnpm exec tsc --noEmit` and `pnpm lint`.
- Marked Phase 1.6 complete in `PLAN.md`.

Decisions:

- Seed uses `ON CONFLICT (id) DO UPDATE` with fixed UUIDs rather than generated IDs.
- `refund_reversal` is a routed compensation action type but does not itself define another compensation template.

Current state:

- The live DSQL cluster contains the stable demo baseline.
- The active customer state is v4 with `refund_status:"none"`.

How to verify:

- Run `pnpm db:seed`.
- Run `pnpm db:seed-check`.

Next action:

- Commit Phase 1.6, then add the foundation smoke script.

## 2026-06-26 - Phase 1.7 Foundation Smoke

Completed:

- Added `pnpm db:smoke`.
- Smoke script verifies live DSQL connectivity.
- Smoke script confirms seeded baseline rows and active v4 state.
- Smoke script exercises `withRetry` locally.
- Smoke script performs a transactional audit write and paired operation trace write.
- Verified with `pnpm db:smoke`, `pnpm exec tsc --noEmit`, and `pnpm lint`.
- Marked Phase 1.7 complete in `PLAN.md`.

Decisions:

- The smoke mutation writes one `audit_events` row and one corresponding `operation_traces` row; it does not create or mutate business action state.

Current state:

- Phase 1 technical foundation is implemented and live-verified against Aurora DSQL.

How to verify:

- Run `pnpm db:smoke`; it should finish with `db:smoke:ok`.

Next action:

- Commit Phase 1.7, then verify git history/status for Phase 1.8.

## 2026-06-26 - Phase 1.8 Foundation Checkpoint

Completed:

- Verified Phase 1 commit history maps to plan tasks.
- Verified working tree has no uncommitted tracked changes before this docs update.
- Verified ignored local-only files are `.env.local`, `node_modules`, `next-env.d.ts`, and `tsconfig.tsbuildinfo`.
- Re-ran live DSQL checks: `pnpm db:connect`, `pnpm db:migrate`, `pnpm db:seed-check`, and `pnpm db:smoke`.
- Marked Phase 1.8 complete in `PLAN.md`.

Decisions:

- Leave `.env.local` and generated build/cache files ignored.

Current state:

- Phase 1 is complete: app scaffold, DSQL connection, migrations, fixed seed data, and smoke verification are all implemented.

How to verify:

- Run `git log --oneline --decorate -12`.
- Run `pnpm db:connect && pnpm db:migrate && pnpm db:seed-check && pnpm db:smoke`.

Next action:

- Commit Phase 1.8 docs, then begin Phase 2.1 domain types and constants.

## 2026-06-26 - Phase 2.1 Domain Types

Completed:

- Added shared action status, gate decision, user role, reversibility class, and action type constants in `src/lib/domain/types.ts`.
- Added reusable `GateResult`, `EvidenceItem`, and `JsonRecord` types.
- Verified with `pnpm exec tsc --noEmit` and `pnpm lint`.
- Marked Phase 2.1 complete in `PLAN.md`.

Decisions:

- Keep the domain vocabulary scoped to the two seeded action type keys: `issue_refund` and `refund_reversal`.

Current state:

- Backend code can now share typed status/decision strings without duplicating literals.

How to verify:

- Run `pnpm exec tsc --noEmit`.
- Run `pnpm lint`.

Next action:

- Commit Phase 2.1, then implement deterministic approval-rule evaluation.

## 2026-06-26 - Phase 2.2 Gate Evaluation

Completed:

- Added JSON helpers for parsing DSQL `json` values.
- Added deterministic gate evaluation in `src/lib/tether/gate.ts`.
- Gate reads `approval_rules` ordered by priority from DSQL.
- Gate evaluates seeded condition JSON against proposed changes, prior state, and risk level.
- Added `pnpm gate:check`.
- Verified the scripted `$1,250` refund routes to `require_approval` with `finance`.
- Verified with `pnpm exec tsc --noEmit` and `pnpm lint`.
- Marked Phase 2.2 complete in `PLAN.md`.

Decisions:

- First matching approval rule wins.
- If no rule matches, the deterministic fallback is `deny` / `rejected`.

Current state:

- The gate is real and data-driven from DSQL, with no model dependency.

How to verify:

- Run `pnpm gate:check`.

Next action:

- Commit Phase 2.2, then implement `POST /v1/actions/propose`.

## 2026-06-26 - Phase 2.3-2.8 Propose And Gate Path

Completed:

- Added scripted `$1,250` refund proposal fixture.
- Implemented `proposeAction` service.
- Added `POST /v1/actions/propose`.
- Proposal path validates input, snapshots active prior state, inserts a proposed action, runs the deterministic gate, updates status, and writes audit/trace rows in the same transaction.
- Sequential idempotency returns an existing proposal before mutation.
- Concurrent idempotency catches SQLSTATE `23505`, fetches the existing proposal, and returns it without duplicating work.
- Added `pnpm propose:check` for the scripted proposal and sequential dedupe.
- Added `pnpm propose:race-check` for three concurrent propose calls with one key.
- Verified with `pnpm propose:check`, `pnpm propose:race-check`, `pnpm exec tsc --noEmit`, and `pnpm lint`.
- Marked Phase 2.3 through Phase 2.8 complete in `PLAN.md`.

Decisions:

- Proposed changes include `refund_amount: 1250` so the deterministic threshold gate does not parse amount from text.
- Auto-approved actions are marked `approved` by the gate; actual auto-execution will be wired in the execute phase.

Current state:

- The scripted refund proposal exists in DSQL as `approval_required` with finance approval required.
- The proposal path is backed by the unique idempotency constraint/index.

How to verify:

- Run `pnpm propose:check`.
- Run `pnpm propose:race-check`.

Next action:

- Commit Phase 2, then begin Phase 3.1 decision endpoint and execution path.

## 2026-06-26 - Phase 3 Approve And Execute

Completed:

- Added atomic execution logic in `src/lib/tether/execute.ts`.
- Added approval/rejection service in `src/lib/tether/decision.ts`.
- Added `POST /v1/actions/{id}/decision`.
- Approval writes `approvals`, status updates, entity version changes, `business_entities.current_version_id`, `executions`, audit rows, and operation traces inside one `writeTransaction`.
- Execute path is idempotent for already executed actions.
- Proposal path now auto-executes actions gated as `auto_approve`, needed later for `refund_reversal`.
- Added `pnpm decision:check`.
- Verified approval moves the scripted refund state to active v5.
- Re-ran `pnpm decision:check` to verify already-executed idempotency.
- Verified with `pnpm propose:check`, `pnpm exec tsc --noEmit`, and `pnpm lint`.
- Marked Phase 3.1 through Phase 3.5 complete in `PLAN.md`.

Decisions:

- `issue_refund` execution appends a new entity version.
- `refund_reversal` execution records a simulated external execution row without mutating entity state; rollback will own the v6 internal restore.

Current state:

- The scripted refund action is executed.
- The customer entity current version is v5 with `refund_status:"pending_refund_1250"`, critical priority, at-risk health, and CSM notified.

How to verify:

- Run `pnpm decision:check`.

Next action:

- Commit Phase 3, then implement rollback and compensation.

## 2026-06-26 - Phase 4 Rollback And Compensation

Completed:

- Refactored proposal creation so rollback can create compensation proposals inside the active rollback transaction.
- Added rollback service in `src/lib/tether/rollback.ts`.
- Added `POST /v1/actions/{id}/rollback`.
- Rollback appends v6 with state copied from the original v4 prior state.
- Rollback writes `rollback_events`, audit rows, and operation traces.
- For `IRREVERSIBLE_EXTERNAL`, rollback creates a `refund_reversal` compensation proposal from the seeded template.
- Compensation routes through the same proposal/gate path and auto-executes as a simulated external reversal request.
- Added `pnpm rollback:check`.
- Updated older verification scripts so they remain valid after the live state advances to v6/compensated.
- Verified with `pnpm rollback:check`, `pnpm db:seed-check`, `pnpm db:smoke`, `pnpm propose:check`, `pnpm decision:check`, `pnpm exec tsc --noEmit`, and `pnpm lint`.
- Marked Phase 4.1 through Phase 4.6 complete in `PLAN.md`.

Decisions:

- Original `issue_refund` status becomes `compensated` after rollback because it is an irreversible external action with a routed compensation.
- v6 contains only restored internal state; the external correction exists as the compensation action and execution row.

Current state:

- The scripted refund action is compensated.
- The customer current version is v6, with v4's internal state restored.
- A `refund_reversal` compensation action exists and is executed.

How to verify:

- Run `pnpm rollback:check`.

Next action:

- Commit Phase 4, then implement read APIs, live Flight Recorder data, and Retry x3 proof endpoints for Phase 5.

## 2026-06-26 - Phase 5 Read APIs And Retry Proof

Completed:

- Added read model helpers in `src/lib/tether/read-model.ts`.
- Added APIs for dashboard data, actions, entity state/versions, audit events, and operation traces.
- `/v1/traces` reads real `operation_traces` rows and can be polled by the frontend Flight Recorder.
- Added Retry x3 proof service and `POST /v1/actions/retry-demo`.
- Retry proof fires three concurrent proposals with one idempotency key, then approves the surviving action exactly once.
- Added `pnpm read:check` and `pnpm retry-proof:check`.
- Verified Retry x3 yields one proposal and one execution.
- Re-ran phase-aware backend checks after retry proof advanced entity state again.
- Verified with `pnpm exec tsc --noEmit` and `pnpm lint`.
- Marked Phase 5.1 through Phase 5.4 complete in `PLAN.md`.

Decisions:

- The live recorder refresh mechanism is a pollable `/v1/traces` endpoint; the TanStack Query one-second polling will be attached in the Phase 6 UI.
- Retry proof approval happens inside the proof service so the demo can show one proposal and one execution without an extra manual click.

Current state:

- The backend spine is complete through propose, gate, approve, execute, rollback, compensation, traces, reads, and retry proof.
- The live DSQL cluster now contains additional proof actions from verification scripts.

How to verify:

- Run `pnpm read:check`.
- Run `pnpm retry-proof:check`.
- Run `pnpm db:smoke && pnpm propose:race-check && pnpm rollback:check && pnpm read:check`.

Next action:

- Commit Phase 5, then create `DESIGN.md` before frontend implementation.

## 2026-06-26 - Phase 6.1 Design Pass

Completed:

- Used the `impeccable` design skill for the frontend phase.
- Created `PRODUCT.md` with product register, users, purpose, personality, anti-references, principles, and accessibility requirements.
- Created `DESIGN.md` before writing UI code.
- Defined base palette with PRD-required hex values plus OKLCH implementation tokens.
- Defined semantic state palette for proposed, gated, approval-required, approved, executed, rejected/denied, rolled-back, and compensated.
- Defined typography, four-panel ASCII layout, component rules, motion rules, signature Ledger Rail, and anti-generic critique.
- Added `.impeccable/live/config.json` for the Next App Router project; CSP detection returned no CSP.
- Marked Phase 6.1 complete in `PLAN.md`.

Decisions:

- Visual direction is restrained light instrumentation, not cream editorial, black-neon control room, or newspaper layout.
- Use Geist and Geist Mono deliberately, with mono as a visible ledger identity.

Current state:

- Frontend implementation is cleared to begin against `DESIGN.md`.

How to verify:

- Read `PRODUCT.md`.
- Read `DESIGN.md`.
- Inspect `.impeccable/live/config.json`.

Next action:

- Commit Phase 6.1, then build the four-panel control surface.

## 2026-06-26 - Phase 6.2-6.7 Frontend Control Surface

Completed:

- Installed `@tanstack/react-query`, `motion`, `lucide-react`, and Playwright for frontend implementation and QA.
- Replaced the starter page with the four-panel Tether console.
- Built Agent Intake, Policy Gate, Decision, and DSQL Flight Recorder panels.
- Wired real backend mutations for propose, approve, rollback, and Retry x3.
- Wired live dashboard polling with TanStack Query at a one-second interval.
- Applied the state-driven semantic palette across pills, rail nodes, diffs, traces, and retry chips.
- Added state-machine rail motion, recorder row arrivals, retry merge chips, loading skeleton, empty/error states, visible focus, and reduced-motion CSS.
- Added `pnpm ui:qa` with Playwright desktop/mobile screenshots and overflow/console checks.
- Fixed a desktop panel-overlap bug found by browser QA.
- Verified with `pnpm ui:qa`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`.
- Completed the `DESIGN.md` anti-generic checklist.
- Marked Phase 6.2 through Phase 6.7 complete in `PLAN.md`.

Decisions:

- The desktop app is viewport-constrained with internal panel scrolling where needed; mobile uses a stacked page flow.
- The Flight Recorder is a compact bottom band on desktop and a full stacked panel on mobile.

Current state:

- Local dev server is running at `http://localhost:3000`.
- Browser screenshots are generated under ignored `artifacts/`.

How to verify:

- Run `pnpm ui:qa`.
- Run `pnpm build`.

Next action:

- Commit Phase 6, then begin Phase 7 shipping artifacts. Deployment still needs Vercel project/team details from the user.

## 2026-06-26 - Phase 7 Shipping Artifacts

Completed:

- Created `docs/ARCHITECTURE.md` with a Mermaid architecture diagram and DSQL design notes.
- Created `docs/DEVPOST.md` with Devpost copy and implementation details.
- Created `docs/DEMO_SCRIPT.md` with a sub-3-minute recording outline.
- Created `docs/SUBMISSION_CHECKLIST.md` with completed and remaining submission items.
- Marked Phase 7.3 and Phase 7.4 complete in `PLAN.md`.

Decisions:

- No existing architecture diagram was present in the workspace, so a new Mermaid version was created.
- Deployment, DSQL console screenshot, video recording/upload, and final submission remain unchecked because they need Vercel/AWS console/user-owned external actions.

Current state:

- The app is ready for local demo at `http://localhost:3000`.
- Phase 7 artifacts are prepared except deployment proof and video/submission.

How to verify:

- Read `docs/ARCHITECTURE.md`.
- Read `docs/DEVPOST.md`.
- Read `docs/DEMO_SCRIPT.md`.
- Read `docs/SUBMISSION_CHECKLIST.md`.

Next action:

- Commit Phase 7 artifacts, then pause on external deployment/submission blockers unless Vercel Team ID and deployment target are provided.

## 2026-06-27 - Authoritative Design Rebuild

### Inputs

- Read the replacement authoritative `DESIGN.md` pasted by the user.
- Treat the backend as complete and keep this pass focused on the two data fixes plus visual/UI rebuild.

### Build Fixes

- Added `resetDemoData()` to delete generated demo rows, restore seeded entity v4, and recreate the canonical scripted proposal through the real propose/gate path.
- Added `pnpm demo:reset` and `POST /v1/demo/reset`.
- Ran `pnpm demo:reset`; result was one `approval_required` canonical `issue_refund` action.
- Verified dashboard reset state directly: active entity `v4`, one action, two real trace rows, prior state is seeded baseline, proposed state contains the refund deltas.

### Next

- Fix UI diff change detection to compare immutable `prior_state` against `proposed_changes`.
- Rebuild the four panels against the dark instrument token system from the new spec.

### Visual Rebuild

- Replaced the previous light/pastel design spec with the authoritative dark instrument `DESIGN.md`.
- Updated diff rows to compare immutable proposal snapshots: `prior_state[k]` versus `proposed_changes[k]`.
- Rebuilt the console with the specified graphite token system, Geist/Geist Mono usage, fixed desktop grid, semantic status map, and `stateStyle()` helper.
- Reworked the Policy Gate rail so only one lifecycle node is active and pending/completed states are visually distinct.
- Promoted the DSQL Flight Recorder to a full 180px desktop tape with mono trace rows, REC indicator, newest-first ordering, and row tick-in motion.
- Added the in-app `Reset demo` control and left the demo in the canonical `approval_required` start state after screenshot refresh.
- Browser QA now enforces no console warnings, no text overflow, four panels on desktop/mobile, trace rows present, and desktop Recorder height at least 180px.

## 2026-06-27 - Marketing Site Visual Replication

### Inputs

- User supplied a monochrome Tether landing-page screenshot as the visual target.
- Assumption: replace the `/` frontend with a marketing-site surface matching the screenshot, while leaving all backend/API routes intact.

### Changes

- Replaced the root dashboard render with a static Tether landing page.
- Built the black space-control visual system across hero, navigation, feature band, mission diagram, testimonials, launch CTA, footer, and not-found page.
- Recreated the space-station, robot, moon, logo, and diagram imagery with inline SVG/CSS so no generated image dependency is required.
- Added the display serif used by the hero/headline treatment and kept compact sans for navigation/body UI.
- Updated `pnpm ui:qa` to verify the landing page sections, desktop/mobile screenshots, text overflow, console warnings, feature cards, and testimonial cards.

### Verification

- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed.
- `pnpm build` passed.
- `pnpm ui:qa` passed and refreshed `artifacts/tether-desktop.png` plus `artifacts/tether-mobile.png`.

## 2026-06-27 - Landing Page Backend Wiring + Generated Assets

### Inputs

- User supplied transparent generated PNGs for the astronaut, gated module, approve/rollback visuals, moon CTA, and satellite station.
- User requested that the landing page connect to the real backend instead of remaining static.

### Changes

- Copied generated PNG assets into `public/tether-assets`.
- Replaced the CSS-drawn station, astronauts, feature glyphs, and moon CTA art with the generated PNGs.
- Converted the landing page to a client component that polls `/v1/dashboard`.
- Wired landing controls to real backend routes:
  - `POST /v1/demo/reset`
  - `POST /v1/actions/{id}/decision`
  - `POST /v1/actions/{id}/rollback`
  - `POST /v1/actions/retry-demo`
- Reworked the central control-plane module so it displays real status, entity version, action id, proposal snapshot diff, and operation traces from Aurora DSQL.
- Updated QA to assert the live control panel and real trace rows are present.

### Verification

- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed.
- `pnpm build` passed.
- `pnpm ui:qa` passed.
- Browser interaction test passed: reset -> approve -> rollback -> backend confirms original `issue_refund` became `compensated` -> reset.
- Final dashboard state verified: `v4`, one action, two traces, latest status `approval_required`.

## 2026-06-29 - Console Route P0

### Inputs

- Read the new product-console request from the attached text.
- Assumption: keep `/` as the marketing page, keep backend gate/execute/rollback/retry/compensation logic stable, and move the real product surface to `/console`.

### Changes

- Added `/console` as the dedicated full-screen Tether product route using the existing DSQL-backed console component.
- Wired marketing "Book a demo" and "Explore product" CTAs to `/console`.
- Removed live mutation controls from the marketing page preview.
- Replaced the landing page's cramped live cockpit with a static console teaser linking to `/console`.

### Verification

- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed with one pre-existing warning in `src/components/tether/product-cockpit.tsx`.

### Next

- Add parameterized proposal composition in `/console` so operators can submit real proposals with arbitrary refund amounts and see different gate routes.

## 2026-06-29 - Parameterized Proposals P0

### Changes

- Added a New action composer to the `/console` Agent Intake panel.
- Operators can choose `issue_refund` or `refund_reversal`, enter refund amount, customer tier, health state, and risk level.
- Custom submissions build real `/v1/actions/propose` payloads and still use the existing gate/propose backend path.
- Kept the scripted `$1,250` refund as a one-click preset.
- Expanded the Policy Gate diff to include dynamic proposal snapshot fields such as `refund_amount` and `tier`.
- Added scoped console CSS for the graphite instrument layout, composer controls, semantic buttons, state rail, diff rows, and Flight Recorder.

### Verification

- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed with the pre-existing `src/components/tether/product-cockpit.tsx` warning.

### Next

- Add the Ledger, Audit Trail, Policies, and Infrastructure views around the cockpit shell.

## 2026-06-29 - Console Depth Views P1

### Changes

- Added read-only `GET /v1/policies` for live `approval_rules`.
- Added read-only `GET /v1/infrastructure` for DSQL connection metadata and row counts.
- Added `/console` sidebar navigation with views for Action Cockpit, Ledger, Audit Trail, Policies, and Aurora DSQL.
- Ledger view shows append-only `entity_versions`, active pointer, creator action, timestamps, and full JSON state.
- Audit Trail view shows chronological `audit_events` and filters by action.
- Policies view renders DSQL approval rule conditions, priority, decision, and required role.
- Infrastructure view shows Aurora DSQL status, region, IAM auth, row counts, retry proof, and trace groups as transaction summaries.

### Verification

- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed with the pre-existing `src/components/tether/product-cockpit.tsx` warning.
- Read-only DSQL check returned `{"rules":5,"tables":15,"status":"connected"}`.

### Next

- Add scoped acting-role enforcement for approvals.

## 2026-06-29 - Role Context Enforcement P2

### Changes

- Added session-only `Acting as` role selector in `/console` for support lead, finance, CSM, and admin.
- Sent the selected role with console approval requests.
- Added backend decision enforcement: approvals compare acting role against the proposal's latest gated required approver role.
- Added clear rejection text when a role mismatch tries to approve.
- Audit `decision_recorded` payloads now include acting role and required approver role.

### Verification

- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed with the pre-existing `src/components/tether/product-cockpit.tsx` warning.
- Live DSQL role check passed: support lead was rejected for the finance-required proposal, finance approval executed, and demo reset returned to canonical start.

### Next

- Run browser QA on `/console` desktop/mobile and address visual or interaction issues.

## 2026-06-29 - Console Browser QA

### Verification

- Started the local dev server at `http://localhost:3000`.
- Browser QA opened `/console` on desktop and mobile.
- Visited Action Cockpit, Ledger, Audit Trail, Policies, and Aurora DSQL views.
- Verified role mismatch: acting as support lead cannot approve the finance-required proposal.
- Verified role match: acting as finance can approve and execute the canonical proposal.
- Verified parameterized proposal: a custom `$50` refund submits through `/v1/actions/propose`.
- Verified Recorder height stayed above 180px (`340.59375px` in the run).
- Captured screenshots at `artifacts/console-desktop.png` and `artifacts/console-mobile.png`.
- Reset demo after QA; final dashboard state was `v4`, one action, two traces, and `approval_required`.

### Remaining Notes

- `pnpm lint` still has the pre-existing unused import warning in the old `/product` cockpit.
- The working tree still contains unrelated pre-existing marketing visual edits in `src/app/globals.css` and `src/components/tether/landing-page.tsx`.
