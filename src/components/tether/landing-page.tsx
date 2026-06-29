"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Infinity,
  RotateCcw,
} from "lucide-react";

type JsonRecord = Record<string, unknown>;

type ActionSummary = {
  id: string;
  agent_name: string;
  action_type_key: string;
  proposed_changes: JsonRecord;
  prior_state: JsonRecord;
  rationale: string;
  evidence: unknown[];
  risk_level: string;
  status: string;
  reversibility_class: string;
  idempotency_key: string;
  created_at: string;
  gate: JsonRecord;
};

type EntitySnapshot = {
  version_number: number;
  state: JsonRecord;
  external_ref: string;
};

type TraceRow = {
  id: string;
  action_id: string | null;
  operation: string;
  table_name: string;
  summary: string;
  created_at: string;
};

type DashboardData = {
  actions: ActionSummary[];
  entity: EntitySnapshot;
  traces: TraceRow[];
};

type RetryProof = {
  action_id: string;
  proposal_count: number;
  execution_count: number;
  status: string;
};

const assets = {
  station: "/tether-assets/satellitestation.png",
  bigMoon: "/tether-assets/AstroBigMoonWithAsteroidsToLeft.png",
  gated: "/tether-assets/AstroGated.png",
  check: "/tether-assets/AstroMiniCheck.png",
  record: "/tether-assets/AstrorecordImage.png",
  rollback: "/tether-assets/AstroMiniRollback.png",
  tiny: "/tether-assets/AstronautForwardMiniIconTiny.png",
  moon: "/tether-assets/AstronautOnMiniMoonNoEffects.png",
  single: "/tether-assets/AstronautSingleFacingForward.png",
  right: "/tether-assets/miniastronaut-facing-right.png",
};

const navItems = [
  { label: "Product", menu: true },
  { label: "Solutions", menu: true },
  { label: "Docs" },
  { label: "Pricing" },
  { label: "Customers" },
  { label: "Company", menu: true },
];

const logos = ["Vercel", "ramp", "Retool", "Hebbia", "LangChain"];

const features = [
  {
    title: "Gate",
    body: "Control what agents can access and do.",
    visual: assets.gated,
  },
  {
    title: "Approve",
    body: "Human-in-the-loop when it matters.",
    visual: assets.check,
  },
  {
    title: "Record",
    body: "Capture every action with immutable logs.",
    visual: assets.record,
  },
  {
    title: "Rollback",
    body: "Revert actions. Restore state. Reduce risk.",
    visual: assets.rollback,
  },
  {
    title: "Govern",
    body: "Policies, permissions, and guardrails at scale.",
    visual: assets.moon,
  },
];

const testimonials = [
  {
    logo: "Vercel",
    quote:
      "Tether gives us the visibility and controls we need to ship agentic features with confidence.",
    name: "Guillermo Rauch",
    role: "CEO, Vercel",
  },
  {
    logo: "ramp",
    quote:
      "We can move faster without losing control. Tether is the guardrail that makes autonomy practical.",
    name: "Eric Glyman",
    role: "CEO, Ramp",
  },
  {
    logo: "Retool",
    quote:
      "Observability, approvals, and rollbacks in one place. It's the missing layer for production-grade agents.",
    name: "David Hsu",
    role: "CEO, Retool",
  },
];

const footerColumns = [
  ["Product", "Overview", "Features", "Integrations", "Pricing"],
  ["Solutions", "Engineering", "Security", "Operations", "AI Governance"],
  ["Resources", "Docs", "Blog", "Case studies", "Help center"],
  ["Company", "About", "Careers", "Partners", "Contact"],
];

const diffKeys = [
  "refund_status",
  "ticket_priority",
  "customer_health",
  "csm_notified",
];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed: ${url}`);
  }

  return body as T;
}

function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (value == null) return "none";
  return JSON.stringify(value);
}

function shortId(id: string | null | undefined): string {
  if (!id) return "pending";
  return id.slice(0, 8);
}

function statusLabel(status: string | undefined): string {
  if (!status) return "Connecting";
  return status.replaceAll("_", " ");
}

function TetherLogo() {
  return (
    <span className="brand-lockup" aria-label="Tether">
      <span className="pixel-mark" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} />
        ))}
      </span>
      <span>Tether</span>
    </span>
  );
}

function Astro({
  src,
  className = "",
  alt = "",
  width = 120,
  height = 120,
}: {
  src: string;
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      alt={alt}
      className={`astro-asset ${className}`}
      height={height}
      priority={className.includes("hero")}
      src={src}
      width={width}
    />
  );
}

function LogoWord({ name }: { name: string }) {
  return (
    <span className={`logo-word logo-${name.toLowerCase()}`}>
      {name === "Vercel" ? <i /> : null}
      {name === "Retool" ? <b /> : null}
      {name === "Hebbia" ? <b /> : null}
      {name === "LangChain" ? <Infinity size={28} strokeWidth={1.8} /> : null}
      {name}
    </span>
  );
}

function StationScene() {
  return (
    <div className="station-scene" aria-label="Tether orbital control station">
      <div className="star-field" />
      <svg className="orbit orbit-one" viewBox="0 0 620 300">
        <ellipse cx="310" cy="150" rx="270" ry="86" />
      </svg>
      <svg className="orbit orbit-two" viewBox="0 0 620 300">
        <ellipse cx="310" cy="150" rx="235" ry="112" />
      </svg>
      <Astro
        alt=""
        className="hero-station"
        height={1254}
        src={assets.station}
        width={1254}
      />
      <Astro
        alt=""
        className="hero-astro hero-astro-a hero-astro-right"
        height={760}
        src={assets.right}
        width={538}
      />
      <Astro
        alt=""
        className="hero-astro hero-astro-b hero-astro-left"
        height={760}
        src={assets.right}
        width={538}
      />
      <Astro
        alt=""
        className="hero-astro hero-astro-c hero-astro-forward"
        height={587}
        src={assets.single}
        width={507}
      />
      <div className="planet planet-a" aria-hidden="true" />
      <div className="planet planet-b" aria-hidden="true" />
    </div>
  );
}

function FeatureGlyph({ src, title }: { src: string; title: string }) {
  return (
    <div className="feature-glyph" aria-hidden="true">
      <Astro
        className={`feature-art feature-art-${title.toLowerCase()}`}
        height={720}
        src={src}
        width={835}
      />
    </div>
  );
}

function LiveDiff({ action }: { action: ActionSummary | undefined }) {
  if (!action) {
    return <div className="live-empty">Reset the demo to create the canonical refund proposal.</div>;
  }

  return (
    <div className="live-diff" aria-label="Live state diff from proposal snapshots">
      {diffKeys.map((key) => (
        <div className="live-diff-row" key={key}>
          <code>{key}</code>
          <span>{formatValue(action.prior_state[key])}</span>
          <b>→</b>
          <strong>{formatValue(action.proposed_changes[key])}</strong>
        </div>
      ))}
    </div>
  );
}

function TraceTape({ traces }: { traces: TraceRow[] }) {
  const latest = traces.slice(-4).reverse();

  return (
    <div className="trace-tape" aria-label="Live operation traces">
      {latest.length ? (
        latest.map((trace) => (
          <div key={trace.id}>
            <span>{trace.operation}</span>
            <code>{trace.table_name}</code>
            <p>{trace.summary}</p>
          </div>
        ))
      ) : (
        <p>No operation traces yet.</p>
      )}
    </div>
  );
}

function ControlDiagram({
  dashboard,
  busy,
  lastEvent,
  onReset,
  onApprove,
  onRollback,
  onRetry,
}: {
  dashboard: DashboardData | null;
  busy: string | null;
  lastEvent: string;
  onReset: () => void;
  onApprove: () => void;
  onRollback: () => void;
  onRetry: () => void;
}) {
  const action = dashboard?.actions[0];
  const canApprove = action?.status === "approval_required";
  const canRollback = action?.status === "executed";

  return (
    <div className="control-diagram" id="how" aria-label="Live Tether control plane">
      <div className="diagram-label">AI agents</div>
      <div className="agent-row">
        {Array.from({ length: 5 }).map((_, index) => (
          <Astro
            alt=""
            className="agent-astro"
            height={587}
            key={index}
            src={assets.tiny}
            width={507}
          />
        ))}
        <span className="more-node">...</span>
      </div>
      <div className="control-plane live-control-plane">
        <TetherLogo />
        <div className="live-ledger-row">
          <span>
            status <strong>{statusLabel(action?.status)}</strong>
          </span>
          <span>
            version <strong>v{dashboard?.entity.version_number ?? "-"}</strong>
          </span>
          <span>
            action <strong>{shortId(action?.id)}</strong>
          </span>
        </div>
        <LiveDiff action={action} />
        <div className="live-actions">
          <button disabled={busy !== null} onClick={onReset} type="button">
            Reset demo
          </button>
          <button disabled={!canApprove || busy !== null} onClick={onApprove} type="button">
            Approve refund
          </button>
          <button disabled={!canRollback || busy !== null} onClick={onRollback} type="button">
            <RotateCcw size={14} />
            Rollback action
          </button>
          <button disabled={busy !== null} onClick={onRetry} type="button">
            Retry ×3
          </button>
        </div>
        <p className="live-event">{busy ?? lastEvent}</p>
      </div>
      <div className="diagram-label">Aurora DSQL operation_traces</div>
      <TraceTape traces={dashboard?.traces ?? []} />
    </div>
  );
}

function MoonPanel() {
  return (
    <div className="moon-panel" aria-hidden="true">
      <Astro
        className="moon-image"
        height={816}
        src={assets.bigMoon}
        width={1448}
      />
    </div>
  );
}

export function LandingPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState("Live DSQL ledger connected.");

  async function refreshDashboard() {
    const nextDashboard = await fetchJson<DashboardData>("/v1/dashboard");
    setDashboard(nextDashboard);
    return nextDashboard;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const nextDashboard = await fetchJson<DashboardData>("/v1/dashboard");
        if (!active) return;
        setDashboard(nextDashboard);
      } catch (error) {
        if (!active) return;
        setLastEvent(error instanceof Error ? error.message : "Dashboard fetch failed.");
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 1800);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  async function runMutation(label: string, mutation: () => Promise<unknown>) {
    setBusy(label);
    try {
      const result = await mutation();
      await refreshDashboard();
      if (label === "Retry proof") {
        const retry = result as RetryProof;
        setLastEvent(
          `Retry proof: ${retry.proposal_count} proposal · ${retry.execution_count} execution · 0 double refunds.`,
        );
      } else {
        setLastEvent(`${label} completed against Aurora DSQL.`);
      }
    } catch (error) {
      setLastEvent(error instanceof Error ? error.message : `${label} failed.`);
    } finally {
      setBusy(null);
    }
  }

  const action = dashboard?.actions[0];
  const heroStatus = useMemo(() => statusLabel(action?.status), [action?.status]);

  return (
    <main className="site-shell">
      <header className="site-header">
        <TetherLogo />
        <nav aria-label="Primary navigation">
          {navItems.map((item) => (
            <a href="#product" key={item.label}>
              {item.label}
              {item.menu ? <ChevronDown size={12} strokeWidth={1.8} /> : null}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <a href="#how">Sign in</a>
          <button
            className="button button-light"
            disabled={busy !== null}
            onClick={() =>
              void runMutation("Reset demo", () =>
                fetchJson("/v1/demo/reset", { method: "POST" }),
              )
            }
            type="button"
          >
            Book a demo
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <h1>
            The control plane
            <br />
            for AI agents
            <br />
            <em>that act.</em>
          </h1>
          <p>
            Tether keeps every agent safe, aligned, and effective. Gate actions.
            Approve with confidence. Record everything. Rollback when needed.
            Govern at scale.
          </p>
          <div className="hero-actions">
            <button
              className="button button-light"
              disabled={busy !== null}
              onClick={() =>
                void runMutation("Reset demo", () =>
                  fetchJson("/v1/demo/reset", { method: "POST" }),
                )
              }
              type="button"
            >
              Book a demo
              <ArrowRight size={18} />
            </button>
            <a className="button button-dark" href="#how">
              Explore product
            </a>
          </div>
          <div className="trusted-row">
            <span>Trusted by engineering & AI teams</span>
            <div>
              {logos.map((logo) => (
                <LogoWord name={logo} key={logo} />
              ))}
            </div>
          </div>
        </div>
        <StationScene />
      </section>

      <section className="feature-band" id="product" aria-label="Tether capabilities">
        {features.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <h2>{feature.title}</h2>
            <FeatureGlyph src={feature.visual} title={feature.title} />
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="mission-section">
        <div className="mission-copy">
          <span>Built for how agents work</span>
          <h2>Mission control for your agent ecosystem.</h2>
          <p>
            Tether sits between your agents and the tools, APIs, and data they
            use, providing policy, visibility, and control across every action.
          </p>
          <a href="#how">
            Current state: {heroStatus}
            <ArrowRight size={18} />
          </a>
        </div>
        <ControlDiagram
          busy={busy}
          dashboard={dashboard}
          lastEvent={lastEvent}
          onApprove={() =>
            action &&
            void runMutation("Approve refund", () =>
              fetchJson(`/v1/actions/${action.id}/decision`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  decision: "approve",
                  note: "Landing page approval from Tether.",
                }),
              }),
            )
          }
          onReset={() =>
            void runMutation("Reset demo", () =>
              fetchJson("/v1/demo/reset", { method: "POST" }),
            )
          }
          onRetry={() =>
            void runMutation("Retry proof", () =>
              fetchJson<RetryProof>("/v1/actions/retry-demo", { method: "POST" }),
            )
          }
          onRollback={() =>
            action &&
            void runMutation("Rollback action", () =>
              fetchJson(`/v1/actions/${action.id}/rollback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  performed_by_user_id: "00000000-0000-4000-8000-000000000102",
                  reason: "Landing page rollback requested by finance.",
                }),
              }),
            )
          }
        />
      </section>

      <section className="testimonial-section" aria-label="Customer quotes">
        <div className="section-rule">
          <span>Trusted by forward-thinking teams</span>
          <ArrowRight size={14} />
        </div>
        <button className="carousel-arrow left" aria-label="Previous testimonial">
          <ArrowLeft size={26} />
        </button>
        <div className="testimonial-grid">
          {testimonials.map((testimonial) => (
            <article className="quote-card" key={testimonial.logo}>
              <LogoWord name={testimonial.logo} />
              <p>“{testimonial.quote}”</p>
              <span>{testimonial.name}</span>
              <small>{testimonial.role}</small>
            </article>
          ))}
        </div>
        <button className="carousel-arrow right" aria-label="Next testimonial">
          <ArrowRight size={26} />
        </button>
      </section>

      <section className="launch-card" id="demo">
        <MoonPanel />
        <div>
          <h2>Ready to launch with confidence?</h2>
          <p>
            Give your agents a control plane. Keep them aligned, accountable,
            and effective.
          </p>
        </div>
        <div className="launch-actions">
          <button
            className="button button-light"
            disabled={busy !== null}
            onClick={() =>
              void runMutation("Reset demo", () =>
                fetchJson("/v1/demo/reset", { method: "POST" }),
              )
            }
            type="button"
          >
            Book a demo
            <ArrowRight size={18} />
          </button>
          <a href="#how">
            Explore product
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <TetherLogo />
          <p>The control plane for AI agents that act.</p>
          <small>© 2024 Tether Systems, Inc. All rights reserved.</small>
        </div>
        {footerColumns.map(([title, ...items]) => (
          <div className="footer-column" key={title}>
            <strong>{title}</strong>
            {items.map((item) => (
              <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>
                {item}
              </a>
            ))}
          </div>
        ))}
        <div className="newsletter">
          <strong>Stay informed</strong>
          <p>Get updates on product and releases.</p>
          <label>
            <span>Email address</span>
            <input type="email" placeholder="Email address" />
            <ArrowRight size={16} />
          </label>
          <div>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#security">Security</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
