# Design

## Mood

A finance lead reviewing a flight-recorder strip in a bright operations room: daylight, enamel instruments, DSQL-backed precision, no theatrical darkness.

## Color

Base palette, named hex values for the PRD:

- Instrument white `#F7F8F5`: app background, a cool off-white with no cream cast.
- Panel zinc `#E7E9E3`: panel surfaces, toolbar bands, empty states.
- Ledger ink `#1D2523`: primary text, labels, high-contrast rules.
- Graphite line `#AEB7B1`: borders, graph edges, inactive ticks.
- DSQL teal `#2A8DA0`: primary action, gated state, live data accents.
- Signal brass `#B9822B`: approval-required state and policy attention.
- Reversal violet `#7C6BB3`: rollback state and rewind motion.

Implementation tokens in OKLCH:

```css
:root {
  --bg: oklch(0.976 0.006 155);
  --surface: oklch(0.922 0.010 155);
  --ink: oklch(0.245 0.018 165);
  --muted: oklch(0.485 0.018 165);
  --line: oklch(0.735 0.015 155);
  --primary: oklch(0.590 0.090 200);
  --attention: oklch(0.620 0.105 72);
  --reversal: oklch(0.575 0.095 292);
}
```

Semantic state palette:

- `proposed` `#6D7A7A`: cool neutral, awaiting judgment.
- `gated` `#2A8DA0`: informational, policy checked.
- `approval_required` `#B9822B`: attention, human approval needed.
- `approved` `#4B9B6B`: affirmative permission.
- `executed` `#176B4D`: committed state.
- `rejected` / `denied` `#A05D5B`: muted negative.
- `rolled_back` `#7C6BB3`: reversed state, not failure.
- `compensated` `#3F7B8F`: corrective external action.

## Type

- Display: Geist, 600 weight, used only for the app title, panel titles, and the state-machine headline.
- Body: Geist, 400 to 550 weight, compact product scale with fixed rem sizing.
- Utility and ledger: Geist Mono, used for IDs, timestamps, SQL-ish trace rows, version labels, diffs, and retry attempt keys.

Type scale:

- Page title: `1.5rem / 1.9rem`, 600.
- Panel title: `0.9rem / 1.2rem`, 600.
- Body: `0.875rem / 1.35rem`, 400.
- Dense labels: `0.75rem / 1rem`, 520.
- Mono trace: `0.75rem / 1.05rem`, 450.

## Layout

Desktop control surface:

```text
┌────────────────────┬──────────────────────────────┬──────────────────────┐
│ Agent Intake       │ Policy Gate                  │ Decision             │
│ proposed actions   │ state-machine rail           │ evidence + controls  │
│ risk + state pills │ cited policy + before/after  │ approve/rollback     │
├────────────────────┴──────────────────────────────┴──────────────────────┤
│ DSQL Flight Recorder: live operation_traces tape, monospace, timestamped │
└───────────────────────────────────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────┐
│ Agent Intake          │
├──────────────────────┤
│ Policy Gate           │
├──────────────────────┤
│ Decision              │
├──────────────────────┤
│ DSQL Flight Recorder  │
└──────────────────────┘
```

Panel roles:

- Agent Intake: scannable action queue with agent, risk, status, amount, and idempotency key.
- Policy Gate: hero surface with the state-machine rail, cited policy, and before/after diff.
- Decision: compact approval and rollback controls with evidence and reversibility class.
- DSQL Flight Recorder: bottom live tape reading real `operation_traces` rows.

## Components

- Status pills: icon plus label, never color alone.
- Action cards: 8px radius, no nested cards, fixed status row height.
- Buttons: icon plus verb-object label for primary controls; compact icon buttons only for obvious utility actions.
- Diff rows: mono key, before value, arrow, after value, semantic state color.
- Trace rows: mono timestamp, operation token, table name, summary, action short ID.
- Retry proof: three attempt chips merge visually into one surviving action ID.

## Motion

- State-machine rail: nodes activate in lifecycle order, with drawn edges and a short active pulse.
- Gate-slam: denied/rejected states stop at the gate with a decisive 180ms ease-out.
- Rollback rewind: v5 dims, v6 materializes as a restored copy of v4, and changed diff rows reverse.
- Flight Recorder: new trace rows tick in like a tape printer.
- Retry x3: three attempt chips converge into one surviving proposal.
- Reduced motion: no movement choreography; use instant state changes, opacity only where helpful.

## Signature

The signature element is the Ledger Rail: a horizontal state-machine track in the Policy Gate that carries a small action token from proposed to gated to approval to executed, then reverses into v6 during rollback. It is also echoed in the Flight Recorder as a thin mono timestamp rail. This is not decoration; it encodes the product thesis that the agent never writes directly, the ledger moves state.

## Anti-generic Critique

- Not cream/serif/terracotta: the surface is cool instrument white, typography is product-sans plus visible mono.
- Not black-plus-neon: the UI is light and operational, with multiple semantic state hues rather than one acid accent.
- Not newspaper hairlines: density comes from tables, traces, and diff rows, not editorial columns.
- Not a generic AI dashboard: the main visual grammar is versioned state and operation traces, not prompts, sparkles, chat bubbles, or gradient cards.
- Not one-note palette: semantic state colors carry meaning across pills, rail nodes, traces, and diffs.

## Quality Checklist

- [ ] Avoids all three AI-default looks.
- [ ] State-driven color is meaningful and consistent.
- [ ] Geist plus Geist Mono pairing is deliberate and visible.
- [ ] Rollback rewind is the orchestrated money shot.
- [ ] Four-panel surface looks bespoke beside polished B2B tools.
- [ ] Loading, empty, error, focus, and reduced-motion states are implemented.
- [ ] Every animation earns its place.
