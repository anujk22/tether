import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Database,
  Infinity,
  RotateCcw,
  ShieldCheck,
  SquareCheck,
} from "lucide-react";

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
    visual: "gate",
  },
  {
    title: "Approve",
    body: "Human-in-the-loop when it matters.",
    visual: "approve",
  },
  {
    title: "Record",
    body: "Capture every action with immutable logs.",
    visual: "record",
  },
  {
    title: "Rollback",
    body: "Revert actions. Restore state. Reduce risk.",
    visual: "rollback",
  },
  {
    title: "Govern",
    body: "Policies, permissions, and guardrails at scale.",
    visual: "govern",
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

function Robot({ className = "" }: { className?: string }) {
  return (
    <span className={`robot ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function StationScene() {
  return (
    <div className="station-scene" aria-hidden="true">
      <div className="star-field" />
      <svg className="orbit orbit-one" viewBox="0 0 620 300">
        <ellipse cx="310" cy="150" rx="270" ry="86" />
      </svg>
      <svg className="orbit orbit-two" viewBox="0 0 620 300">
        <ellipse cx="310" cy="150" rx="235" ry="112" />
      </svg>
      <svg className="orbit orbit-three" viewBox="0 0 620 300">
        <ellipse cx="310" cy="150" rx="185" ry="56" />
      </svg>
      <div className="space-station">
        <div className="dish" />
        <div className="tower">
          <i />
          <i />
          <i />
        </div>
        <div className="ring ring-top" />
        <div className="ring ring-mid">
          {Array.from({ length: 14 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="ring ring-bottom" />
        <div className="core" />
      </div>
      <Robot className="robot-a" />
      <Robot className="robot-b" />
      <Robot className="robot-c" />
      <Robot className="robot-d" />
      <div className="satellite">
        <span />
        <span />
      </div>
      <div className="planet planet-a" />
      <div className="planet planet-b" />
      <div className="system-status">
        <small>System status</small>
        <span>All systems nominal</span>
      </div>
    </div>
  );
}

function FeatureGlyph({ type }: { type: string }) {
  return (
    <div className={`feature-glyph feature-${type}`} aria-hidden="true">
      {type === "gate" ? (
        <>
          <span className="vault" />
          <Robot />
        </>
      ) : null}
      {type === "approve" ? (
        <>
          <Robot />
          <SquareCheck size={28} strokeWidth={1.4} />
        </>
      ) : null}
      {type === "record" ? (
        <>
          <Robot />
          <Database size={30} strokeWidth={1.4} />
        </>
      ) : null}
      {type === "rollback" ? (
        <>
          <Robot />
          <RotateCcw size={30} strokeWidth={1.4} />
        </>
      ) : null}
      {type === "govern" ? (
        <>
          <Robot />
          <ShieldCheck size={30} strokeWidth={1.4} />
        </>
      ) : null}
    </div>
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

function ControlDiagram() {
  return (
    <div className="control-diagram" aria-label="AI agents connect through Tether">
      <div className="diagram-label">AI agents</div>
      <div className="agent-row">
        {Array.from({ length: 5 }).map((_, index) => (
          <Robot key={index} />
        ))}
        <span className="more-node">...</span>
      </div>
      <div className="control-plane">
        <TetherLogo />
        <div className="control-tabs">
          {features.map((feature) => (
            <span key={feature.title}>{feature.title}</span>
          ))}
        </div>
      </div>
      <div className="diagram-label">Tools, data & infrastructure</div>
      <div className="tool-row">
        {["◎", "▰", "⚙", "✶", "aws", "..."].map((tool) => (
          <span key={tool}>{tool}</span>
        ))}
      </div>
    </div>
  );
}

function MoonPanel() {
  return (
    <div className="moon-panel" aria-hidden="true">
      <div className="moon-orbits" />
      <div className="moon-surface" />
      <Robot className="moon-robot" />
      <span className="flag" />
      <span className="small-planet planet-one" />
      <span className="small-planet planet-two" />
      <span className="small-planet planet-three" />
    </div>
  );
}

export function LandingPage() {
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
          <a href="#signin">Sign in</a>
          <a className="button button-light" href="#demo">
            Book a demo
            <ArrowRight size={16} />
          </a>
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
            <a className="button button-light" href="#demo">
              Book a demo
              <ArrowRight size={18} />
            </a>
            <a className="button button-dark" href="#product">
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
            <FeatureGlyph type={feature.visual} />
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
            See how Tether works
            <ArrowRight size={18} />
          </a>
        </div>
        <ControlDiagram />
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
          <a className="button button-light" href="#demo">
            Book a demo
            <ArrowRight size={18} />
          </a>
          <a href="#product">
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
