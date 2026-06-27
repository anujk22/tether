Tether — DESIGN.md (authoritative visual spec)
Codex — read this fully before touching UI. The current build is real on the backend (good) but the frontend landed as a soft cream/sage pastel dashboard, which is exactly the generic, templated B2B look PRD Part 2 told you to avoid, and the center diff is broken. This document replaces your previous design pass. Do the three build fixes first (the design sits on top of clean data), then rebuild the visual system to these exact tokens. Leave nothing to interpretation — every color, size, and behavior is specified below. When something here conflicts with what you built, this wins.

0. THREE BUILD FIXES FIRST (do these before redesigning)
Fix 1 — the before/after diff must render from immutable snapshots, not live state. Right now the diff shows identical values on both sides (pending refund 1250 → pending refund 1250), which makes the hero panel look broken. Cause: you're computing the diff from current entity state. Render it instead from the proposal's stored prior_state (left) vs proposed_changes (right) columns, which were snapshotted at propose-time. Then it always shows the true delta, even on completed actions. A row is "changed" when prior_state[k] !== proposed_changes[k].
Fix 2 — build demo:reset (script + button) and clean the cluster. The Agent Intake column is a wall of duplicate $1,250 cards from QA scripts, and the top counters (v16 · traces 80 · actions 14) advertise the mess. Write a pnpm demo:reset script and a small "Reset demo" control that: deletes all generated action_proposals, approvals, executions, rollback_events, compensation_actions, audit_events, operation_traces, and any entity_versions above the seeded baseline; then restores exactly ONE canonical scenario. After reset the screen shows a single story, not a ledger dump.
Fix 3 — the canonical demo starts in proposed. Reset must leave the demo with one issue_refund proposal in status proposed (or approval_required), so: the Approve / Rollback CTAs are LIVE not greyed, and the diff shows the real delta — refund_status: none → pending_refund_1250, ticket_priority: normal → critical, customer_health: stable → at_risk, csm_notified: false → true. The seeded active entity version is v4; the top counter should read v4 after reset, not v16.
Do not start the visual rebuild until reset produces one clean proposed action whose diff shows four changed rows.

1. DESIGN CONCEPT — commit to this, don't drift
Tether is precision instrumentation for high-stakes, reversible actions. The lineage is a glass cockpit, a financial terminal, a flight recorder — calm authority under high stakes. Dense information presented so it feels effortless and exact. NOT friendly, NOT pastel, NOT a generic admin template.
You are building a considered dark instrument, not the reflexive "near-black + one neon accent" AI default. The way you avoid that default is the core idea below.
The distinctive, justified move — a state-driven semantic color system. Tether is fundamentally a state machine, so the states drive the color. Color = meaning here, not decoration. Every lifecycle state has its own distinct hue, applied consistently everywhere it appears (timeline node, status pill, trace badge, the diff, the button that produces it). This is what makes the UI legible and unmistakably about governed state — and it's the opposite of a one-accent dashboard.

2. CSS TOKENS — paste these exactly into globals.css
Use Tailwind v4 with @theme mapping these CSS variables. These are the only colors allowed in the app. Do not introduce ad-hoc hexes.
:root {
  /* ---- surfaces (considered cool graphite, NOT flat black, NOT pastel) ---- */
  --bg-base:      #0B0E14;  /* app canvas */
  --bg-panel:     #11151F;  /* panel surface */
  --bg-elevated:  #161B27;  /* cards inside panels */
  --bg-inset:     #080B11;  /* wells, diff cells, the Flight Recorder (darkest) */

  /* ---- structure ---- */
  --border-subtle:#1E2533;
  --border-strong:#2A3343;
  --hairline:     #161D29;

  /* ---- text ---- */
  --text-primary:   #E6EAF2;  /* near-white, cool */
  --text-secondary: #9AA5B8;
  --text-tertiary:  #5C6675;  /* labels, captions, meta */
  --text-mono:      #C6D0E0;  /* recorder / code */

  /* ---- STATE SEMANTIC PALETTE (each state = distinct, meaningful hue) ---- */
  --state-proposed:  #8A93A6;  /* slate grey-blue — neutral, awaiting judgment */
  --state-gated:     #38B2C4;  /* cyan — being evaluated */
  --state-approval:  #E6A23C;  /* amber — needs a human (the demo's beacon) */
  --state-approved:  #43B581;  /* green — yes */
  --state-executed:  #5B6AD9;  /* indigo — committed to the ledger */
  --state-rejected:  #CC5F77;  /* clay-rose — denied (muted, not alarmist) */
  --state-rolledback:#9D6FE0;  /* violet — reversed/undone (NOT red; reversal ≠ failure) */
  --state-compensated:#2FA8A0; /* teal — corrective settlement */

  /* ---- brand / focus (tied to the product's verb: committing actions) ---- */
  --accent:        #5B6AD9;    /* = executed indigo; the brand is "commit to record" */
  --focus-ring:    #5B6AD9;

  /* ---- feedback ---- */
  --danger:        #CC5F77;
  --success:       #43B581;

  /* ---- radii (tight + precise; not pill-friendly, not brutalist-zero) ---- */
  --radius-sm: 6px;
  --radius-md: 8px;   /* workhorse */
  --radius-lg: 12px;  /* panels */

  /* ---- type scale (dense control surface) ---- */
  --fz-2xs: 11px;  /* trace meta, field labels */
  --fz-xs:  12px;  /* captions */
  --fz-sm:  13px;  /* card body */
  --fz-base:14px;  /* default */
  --fz-md:  16px;  /* emphasis */
  --fz-lg:  18px;  /* panel titles */
  --fz-xl:  22px;  /* app title */
}

State color usage rule: use each state hue as a fill at low opacity + a border + an icon/text color, never as a large flat block of saturated color. For a pill/node in state X: background = color-mix(in srgb, var(--state-X) 14%, var(--bg-elevated)), border = color-mix(in srgb, var(--state-X) 40%, transparent), text/icon = var(--state-X) (lightened ~15% if contrast needs it). Provide one helper, stateStyle(status), that returns these three values, and one map STATUS_TO_STATE from DB status → token name. Use it everywhere a status appears so a status is the same color in the card, the node, the diff, and the trace.

3. TYPOGRAPHY — exact
UI sans: Geist (via the geist package / next/font), weights 400/500/600. Fallback: Inter, system-ui.
Mono (identity element — use it visibly): Geist Mono, weights 400/500. Fallback: "JetBrains Mono", "Commit Mono", ui-monospace. Use mono for: the Flight Recorder, all IDs, timestamps, amounts, version numbers, table/column names, and diff values. Mono is part of the brand — let it show.
Numbers: always font-variant-numeric: tabular-nums. Amounts render in mono ($1,250 with the $ in --text-tertiary).
Field labels (e.g. "Matched policy", "Required role"): --fz-2xs, uppercase, letter-spacing: 0.08em, weight 500, color --text-tertiary.
Panel titles: --fz-lg, weight 600, --text-primary, with the panel's icon at 16px in --text-secondary.
App title: --fz-xl, weight 600. Tagline under it: --fz-xs, --text-tertiary.
Line-height: 1.4 body, 1.2 titles. Don't over-space; this is an instrument.

4. LAYOUT — exact structure
Page: --bg-base, padding 24px, a faint 1px dot-grid texture at ~3% opacity (subtle, optional).
Top bar: left = "Tether" wordmark (weight 600) + tagline "The control plane for AI agents that act" beneath. Right = three live counters as mono chips: v {n} · traces {n} · actions {n}, each in a --bg-elevated pill with --border-subtle, numbers tabular. After reset these read clean (e.g. v4 · traces 6 · actions 1).
Body grid: three columns + a full-width bottom row, 16px gap.
Agent Intake — left, fixed ~320px.
Policy Gate — center, flexible, the WIDEST (this is the hero; give it the most room).
Decision — right, fixed ~380px.
DSQL Flight Recorder — full width, bottom, min-height 180px (not a 40px sliver).
Panels: --bg-panel, --border-subtle 1px, --radius-lg, 16–20px internal padding, title row with a 1px --hairline divider beneath.

5. PANEL-BY-PANEL TREATMENT
5.1 Agent Intake (left)
After reset, ONE canonical card, selected. Card = --bg-elevated, --radius-md, --border-subtle; the selected card gets a 2px left border in --accent and a slightly lighter bg.
Row 1: agent name SupportAgent-04 (--fz-sm, --text-secondary) + state pill (top-right, using stateStyle).
Row 2: amount + action — $1,250 (mono, --fz-md, --text-primary) then issue refund (--fz-sm, --text-secondary).
Row 3: risk tag HIGH (--fz-2xs, uppercase, tracked; HIGH in --state-approval, MEDIUM in --text-secondary, LOW in --text-tertiary) + short id (mono, --text-tertiary, right).
"Propose refund" primary button pinned at the column bottom (see §6 button rules).
Empty state (after reset before any extra propose): a centered, quiet line "Queue clear — propose an action to begin."
5.2 Policy Gate (center, the hero — spend your craft here)
State-machine stepper across the top. Nodes in lifecycle order: Proposed · Gated · Approval required · Approved · Executed · Rolled back · Compensated. Each node:
completed: filled with its state color treatment, small check or its state glyph, connector line to its right filled in that state's color.
active (current): ring in its state color + a soft outer glow (box-shadow: 0 0 0 4px color-mix(state 18%, transparent)) + a slow breathing pulse (scale 1.0→1.04, 2s, ease-in-out). Only ONE node is active at a time.
pending: hollow, --border-strong ring, --text-tertiary glyph, connector line --hairline.
Do NOT light every node at once (the current build does this — it reads as decoration, not state).
Three context cards below the stepper: Matched policy / Required role / Active version. --bg-inset, --radius-md, label in field-label style, value in --text-primary (finance, v4, etc.).
The diff (driven by Fix 1, from snapshots): one row per field. Each row: column name (mono, --text-tertiary) | before value (mono, --text-secondary, in a --bg-inset cell) | arrow → | after value (mono, weight 500, --text-primary, in a cell tinted with the relevant state). Changed rows get a 2px left accent bar in --state-approval and the after-cell tinted; unchanged rows are dimmed to ~55% opacity. The four demo rows must read as changed.
5.3 Decision (right)
Status pill at top (stateStyle).
A short natural-language summary (--text-secondary, --fz-sm).
Evidence cards (keep these — they're good): Customer report / Payment signal / Account tier / each as --bg-inset card with a field-label, a primary-text headline, and a mono source tag (support_ticket, simulated_payments, crm_snapshot) in --text-tertiary.
Reversibility card: "Compensation required" or "Exact rollback available" with the matching state hint.
Buttons (see §6): Approve refund (green), Rollback action (violet), Simulate retry ×3 (neutral). Disable + dim states that don't apply to the current status, but in the canonical proposed/approval_required start, Approve is live.
The retry chips (1·2·3) live here under the retry button.
5.4 DSQL Flight Recorder (bottom, full width — make it the alive element)
This is your strongest on-brand surface; the current build shrinks it to nothing. Make it a true black-box tape:
Background --bg-inset (darker than panels), --radius-lg, min-height 180px, internal mono.
Title row: "DSQL Flight Recorder" + a pulsing REC ● in --danger at low opacity (1.2s) + operation_traces label (mono, --text-tertiary, right).
Each row, monospace, columns: HH:MM:SS.mmm (--text-tertiary) · operation badge INSERT/UPDATE (tiny, --bg-elevated chip, colored by affected-table's state when applicable) · table_name (--text-mono) · summary (--text-primary) · action_id (right, --text-tertiary).
New rows tick in from the top: a 180ms slide-down + a one-shot highlight flash (background pulse in the row's state color at ~20% fading to transparent), like a seismograph/printer. Newest at top. Keep ~30 visible, scroll for more.

6. BUTTONS — colored by the state they produce (a meaning-driven rule)
Buttons inherit the semantic palette of their outcome:
Propose refund → neutral/brand: --accent indigo, solid, --text-primary on it.
Approve refund → --state-approved green.
Rollback action → --state-rolledback violet.
Simulate retry ×3 → ghost/neutral: transparent, --border-strong, --text-secondary; hover fills --bg-elevated. Button spec: height 40px, --radius-md, weight 500, --fz-sm, 12px icon left of label. Solid buttons: bg = the state color, text = --bg-base or white per contrast; hover = +8% lightness; disabled = 40% opacity, no pointer. Every button keeps its label's verb through the flow (a "Rollback" button → a "Rolled back" toast).

7. THE SIGNATURE MOTION (orchestrated — this is where points are won)
Build these four with care; cut any other animation that doesn't earn its place. All respect prefers-reduced-motion (replace slides/sweeps with simple cross-fades).
Stepper advance: when status changes, the new node transitions pending→active (ring draws, glow fades in, breathing starts) and the prior node settles to completed; the connector line between them fills in ~300ms.
Gate-slam: on approval_required/deny, the approval node snaps in with a quick scale 1.12→1.0 "stop" motion and the Matched-policy card's left border flashes --state-approval once.
Rollback rewind (the money shot): on rollback — the Executed node + version pill desaturate/dim; a --state-rolledback violet sweep animates right→left across the stepper; the version pill counts up (v_n → v_n+1) labeled "restoring v4"; the diff's after-column values animate back toward v4 values; the Rolled-back node lights. ~900ms, eased. This must feel like time reversing. It is the emotional peak of the demo — make it deliberate.
Retry ×3 merge: chips 2 and 3 slide into chip 1 and collapse with a snap, resolving to "1 proposal · 1 execution · 0 double refunds."

8. ACCESSIBILITY & QUALITY FLOOR (non-negotiable)
Text contrast ≥ WCAG AA on --bg-base/--bg-panel. Use state hues mostly as fills/borders/icons; keep running text in the --text-* tokens (which are AA). Where a state color is used as text, lighten until AA passes.
Visible focus ring: 2px --focus-ring, 2px offset, on every interactive element. Full keyboard operability.
prefers-reduced-motion: cross-fades instead of slides/sweeps; no breathing pulse.
Real states everywhere: loading = skeletons (not spinners), empty = a written invitation, error = a toast that says what failed and what to do.
Min hit target 36px. Responsive: at narrow widths, stack the three columns vertically and keep the Recorder full-width at the bottom; verify no text overlap (the previous build had overlap — QA this on mobile with screenshots).

9. THE DESIGN.md DELIVERABLE + SELF-AUDIT
You already have this file — treat it as the design plan. Before you call the UI done, run this anti-generic audit honestly and fix any "no":
[ ] Does it avoid all three AI-default looks (cream+serif+terracotta; near-black+one neon accent; broadsheet hairlines+zero radius)? A considered dark with a multi-hue semantic system is not the neon-accent default — confirm it reads that way.
[ ] Is color state-driven and meaningful, the same hue for a status everywhere it appears?
[ ] Is the Geist + Geist Mono pairing in, with mono used visibly as identity?
[ ] Is there ONE orchestrated signature (the rollback rewind) executed with precision?
[ ] Would a screenshot look intentional next to Linear / Stripe / Vercel — or like a Tailwind template? (The current pastel build fails this. The rebuild must pass it.)
[ ] Is the Flight Recorder a prominent, alive black-box tape — not a 40px sliver?
[ ] Real loading/empty/error states; AA contrast; visible focus; reduced-motion handled?

10. ORDER OF OPERATIONS & DEFINITION OF DONE
Order: (1) Fix the diff from snapshots → (2) demo:reset + clean cluster + canonical proposed start → (3) drop in the token system + type → (4) rebuild the four panels to §5 → (5) wire stateStyle/STATUS_TO_STATE so status color is consistent everywhere → (6) build the four signature motions → (7) a11y/quality floor → (8) self-audit §9 → (9) re-screenshot desktop + mobile → then Phase 7 (deploy, screenshot, video).
Design Definition of Done:
[ ] Reset yields ONE clean canonical proposed action; counters read clean (v4).
[ ] The diff shows four genuinely changed rows from snapshots (no identical-side rows).
[ ] The token system + Geist/Geist Mono are applied app-wide; zero ad-hoc hexes; zero pastel cream/sage remaining.
[ ] Each status renders the same semantic hue in card, node, diff, and trace.
[ ] Stepper shows distinct completed/active/pending states (only one active).
[ ] Flight Recorder is ≥180px, mono, with ticking rows + REC indicator.
[ ] Rollback rewind motion lands as the visible peak.
[ ] Anti-generic audit (§9) all checked; mobile QA done.
[ ] Update PROGRESS.md after each step so this is resumable.
Keep the backend exactly as is — it's done and verified. This is a visual + two data fixes, not a rebuild. When in doubt, choose the more precise, more instrument-like option over the softer one.


