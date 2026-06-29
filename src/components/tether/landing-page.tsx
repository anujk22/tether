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
  miniMoon: "/tether-assets/minimoon.png",
  miniSatellite: "/tether-assets/minisatellite.png",
  single: "/tether-assets/AstronautSingleFacingForward.png",
  right: "/tether-assets/miniastronaut-facing-right.png",
};

const builtWith = [
  { label: "Vercel", mark: "vercel" },
  { label: "AWS Aurora DSQL", mark: "aws" },
  { label: "Next.js", mark: "next" },
  { label: "React", mark: "react" },
  { label: "TypeScript", mark: "ts" },
] as const;

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

function BuiltWithLogo({ mark }: { mark: (typeof builtWith)[number]["mark"] }) {
  if (mark === "vercel") {
    return <span className="built-logo built-logo-vercel" aria-hidden="true" />;
  }

  if (mark === "aws") {
    return (
      <span className="built-logo built-logo-aws" aria-hidden="true">
        <span>aws</span>
      </span>
    );
  }

  if (mark === "react") {
    return (
      <span className="built-logo built-logo-react" aria-hidden="true">
        <svg viewBox="0 0 28 28">
          <ellipse cx="14" cy="14" rx="11" ry="4.4" />
          <ellipse cx="14" cy="14" rx="11" ry="4.4" transform="rotate(60 14 14)" />
          <ellipse cx="14" cy="14" rx="11" ry="4.4" transform="rotate(120 14 14)" />
          <circle cx="14" cy="14" r="2.2" />
        </svg>
      </span>
    );
  }

  if (mark === "ts") {
    return (
      <span className="built-logo built-logo-ts" aria-hidden="true">
        TS
      </span>
    );
  }

  return (
    <span className="built-logo built-logo-next" aria-hidden="true">
      N
    </span>
  );
}

function StationScene() {
  return (
    <div className="station-scene" aria-label="Tether orbital control station">
      <div className="star-field" />
      <svg className="orbit-map" viewBox="0 0 820 520" aria-hidden="true">
        <path d="M86 106 C128 76 158 78 176 108 C198 146 160 184 124 172 C104 164 112 140 138 136 C196 128 232 178 206 216 C184 248 140 246 132 218 C124 190 162 178 214 202 C248 218 282 224 318 214" />
        <path d="M318 72 C430 28 598 36 670 88 C736 136 726 198 654 224 C584 248 504 222 528 176 C550 132 660 130 784 206" />
        <path d="M-18 332 C78 278 164 282 252 306 C344 332 430 378 548 386 C654 394 738 366 836 320" />
        <path d="M72 436 C118 388 150 386 178 350 C214 304 204 254 244 226 C272 206 306 220 318 252" />
        <path d="M484 286 C570 270 634 294 688 328 C724 350 756 346 800 312" />
        <path d="M-22 420 C92 360 182 388 288 406 C416 426 558 424 710 386" />
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
      <Astro
        alt=""
        className="hero-astro hero-astro-e hero-astro-left"
        height={760}
        src={assets.right}
        width={538}
      />
      <Astro
        alt=""
        className="hero-moon hero-moon-a"
        height={279}
        src={assets.miniMoon}
        width={280}
      />
      <Astro
        alt=""
        className="hero-mini-satellite"
        height={477}
        src={assets.miniSatellite}
        width={522}
      />
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
                Built for support, finance, and operations teams that need to govern
                AI agent writes — refunds, customer state, payments — before trusting
                agents in production.
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
                <div className="built-with-row-primary">
                  {builtWith.slice(0, 2).map((item) => (
                    <strong key={item.label}>
                      <BuiltWithLogo mark={item.mark} />
                      {item.label}
                    </strong>
                  ))}
                </div>
                <div className="built-with-row-secondary">
                  {builtWith.slice(2).map((item) => (
                    <strong key={item.label}>
                      <BuiltWithLogo mark={item.mark} />
                      {item.label}
                    </strong>
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
                Tether guarantees exactly-once execution and exact rollback because
                every action is an immutable, versioned transaction in Aurora DSQL:
                strong consistency plus a unique idempotency key.
              </p>
              <p>
                Without a strongly-consistent ledger, you cannot promise a finance
                team a refund will not fire twice.
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
