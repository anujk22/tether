"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { ConsoleSidebar } from "@/components/tether/console-sidebar";

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

const builtWith = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "AWS Aurora DSQL",
];

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

const footerLinks = [
  ["How it works", "#how-it-works"],
  ["Architecture", "#architecture"],
  ["Open Console", "/console"],
];

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

function StationScene() {
  return (
    <div className="station-scene" aria-label="Tether orbital control station">
      <div className="star-field" />
      <svg className="orbit-map" viewBox="0 0 820 520" aria-hidden="true">
        <path d="M84 158 C178 62 338 112 460 84 C600 48 780 84 724 188 C690 250 574 250 482 226" />
        <path d="M92 184 C44 210 52 272 125 270 C184 268 142 198 204 202" />
        <path d="M22 342 C150 244 288 306 412 312 C548 318 646 286 796 330" />
        <path d="M224 214 C252 264 184 302 188 356 C192 412 128 426 76 404" />
        <path d="M510 238 C578 236 600 294 650 252 C682 226 720 232 764 210" />
        <path d="M544 330 C610 330 654 350 704 396" />
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
      <Astro
        alt=""
        className="hero-astro hero-astro-d hero-astro-left"
        height={760}
        src={assets.right}
        width={538}
      />
      <div className="hero-satellite" aria-hidden="true">
        <span />
        <span />
      </div>
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

function ConsoleTeaser() {
  return (
    <a className="console-teaser" id="how" href="/console" aria-label="Open Tether console">
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
      <div className="control-plane teaser-control-plane">
        <TetherLogo />
        <div className="teaser-ledger-row">
          <span>
            status <strong>approval required</strong>
          </span>
          <span>
            version <strong>v4</strong>
          </span>
          <span>
            action <strong>open console</strong>
          </span>
        </div>
        <div className="teaser-diff" aria-hidden="true">
          {[
            ["refund_status", "none", "pending_refund_1250"],
            ["ticket_priority", "normal", "critical"],
            ["customer_health", "stable", "at_risk"],
            ["csm_notified", "false", "true"],
          ].map(([field, before, after]) => (
            <div key={field}>
              <code>{field}</code>
              <span>{before}</span>
              <b>→</b>
              <strong>{after}</strong>
            </div>
          ))}
        </div>
        <span className="teaser-cta">
          Explore full console
          <ArrowRight size={15} />
        </span>
      </div>
      <div className="diagram-label">Aurora DSQL operation_traces</div>
      <div className="teaser-trace-tape" aria-hidden="true">
        <div>
          <span>INSERT</span>
          <code>action_proposals</code>
          <p>Inserted proposed issue_refund action.</p>
        </div>
        <div>
          <span>UPDATE</span>
          <code>action_proposals</code>
          <p>Gate set status to approval_required.</p>
        </div>
      </div>
    </a>
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
  return (
    <main className="landing-shell">
      <ConsoleSidebar activeView="home" mode="links" />
      <div className="landing-main">
        <div className="site-shell" id="top">
          <section className="hero-section">
            <div className="hero-copy">
              <h1>
                <span>The control plane</span>
                <span>for AI Agents</span>
                <em>that act</em>
              </h1>
              <p>
                Tether keeps every agent safe, aligned, and effective. Gate actions.
                Approve with confidence. Record everything. Rollback when needed.
                Govern at scale.
              </p>
              <div className="hero-actions">
                <a className="button button-light" href="/console">
                  Launch Console
                  <ArrowRight size={18} />
                </a>
                <a className="button button-dark" href="#architecture">
                  View architecture
                </a>
              </div>
              <div className="built-with-row">
                <span>Built with</span>
                <div>
                  {builtWith.map((item) => (
                    <strong key={item}>{item}</strong>
                  ))}
                </div>
              </div>
            </div>
            <StationScene />
          </section>

          <section
            className="feature-band"
            id="how-it-works"
            aria-label="Tether capabilities"
          >
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h2>{feature.title}</h2>
                <FeatureGlyph src={feature.visual} title={feature.title} />
                <p>{feature.body}</p>
              </article>
            ))}
          </section>

          <section className="mission-section" id="architecture">
            <div className="mission-copy">
              <span>Built for how agents work</span>
              <h2>Mission control for your agent ecosystem.</h2>
              <p>
                Tether sits between your agents and the tools, APIs, and data they
                use, providing policy, visibility, and control across every action.
              </p>
              <a href="#architecture">
                See the console preview
                <ArrowRight size={18} />
              </a>
            </div>
            <ConsoleTeaser />
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
              <a className="button button-light" href="/console">
                Open Console
                <ArrowRight size={18} />
              </a>
              <a href="#architecture">
                View architecture
                <ArrowRight size={18} />
              </a>
            </div>
          </section>

          <footer className="site-footer">
            <div className="footer-brand">
              <TetherLogo />
              <p>The control plane for AI agents that act.</p>
            </div>
            <div className="footer-column">
              <strong>Demo paths</strong>
              {footerLinks.map(([label, href]) => (
                <a href={href} key={label}>
                  {label}
                </a>
              ))}
            </div>
            <div className="footer-note">
              <strong>Hackathon build</strong>
              <p>
                The agent and downstream systems are simulated. The approval gate,
                versioning, rollback, compensation, retry proof, and Aurora DSQL
                trace rows are real.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
