import Link from "next/link";
import { ArrowRight } from "lucide-react";

type InfoPageProps = {
  title: string;
  eyebrow: string;
  body: string;
  items: Array<{
    title: string;
    body: string;
  }>;
};

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

export function InfoPage({ title, eyebrow, body, items }: InfoPageProps) {
  return (
    <main className="info-shell">
      <header className="info-header">
        <Link href="/">
          <TetherLogo />
        </Link>
        <nav aria-label="Section navigation">
          <Link href="/product">Product</Link>
          <Link href="/solutions">Solutions</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/customers">Customers</Link>
          <Link href="/company">Company</Link>
        </nav>
      </header>
      <section className="info-hero">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{body}</p>
        <Link className="button button-light" href="/product">
          Open control plane
          <ArrowRight size={18} />
        </Link>
      </section>
      <section className="info-grid">
        {items.map((item) => (
          <article key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
