# Product

## Register

product

## Users

Finance approvers, support leads, CSMs, and operators responsible for approving AI-proposed business actions. They use Tether during high-stakes support or finance workflows where an agent may change customer state, issue a refund, or trigger a downstream workflow. Their job is to see what the agent wants to do, why it is risky, what policy applies, what state will change, and how the action can be reversed or compensated.

## Product Purpose

Tether is the governed write path for AI agents. It gates proposed actions before execution, routes risky ones for approval, records every lifecycle event in Aurora DSQL, executes exactly once through idempotency and OCC-safe writes, and restores mistakes through versioned rollback or compensating actions. Success means a judge can see that the database is load-bearing: the UI reads real proposals, versions, traces, audit events, rollback rows, and compensation rows.

## Brand Personality

Calm, exact, operational. Tether should feel like precision instrumentation for business state: quiet enough for repeated use, clear enough for a live demo, and serious enough for finance and database specialists. The product voice is active and concrete: "Approve refund", "Rollback action", "One proposal, one execution."

## Anti-references

- Generic AI dashboards with purple gradients, floating blobs, and oversized prompt cards.
- Cream editorial SaaS pages with serif headlines and terracotta accents.
- Black control-room interfaces with a single neon accent.
- Broadsheet layouts with dense newspaper columns and decorative hairlines.
- Out-of-the-box shadcn styling, indistinct cards, and decorative terminal panels that do not read real data.

## Design Principles

- Make state visible: every status, trace, version, and rollback has a consistent semantic treatment.
- The ledger is the authority: UI copy and motion should reveal the database-backed lifecycle rather than imply magic.
- Dense but legible: operators should scan action risk, policy, diff, and trace data without hunting.
- Motion proves causality: animation is reserved for gate progression, retry merge, trace arrival, and rollback rewind.
- Simulated means labeled: the agent and downstream system can be fixtures, but the control-plane internals must look and behave real because they are real.

## Accessibility & Inclusion

Target WCAG AA contrast or better for body text and controls. Do not rely on color alone for state; pair semantic color with labels, icons, and trace text. Respect `prefers-reduced-motion` with instant or low-motion state changes. Preserve visible keyboard focus across action cards, approval controls, rollback, and retry proof controls. Avoid text overflow on mobile and make the four-panel layout collapse into a usable stacked workflow.
