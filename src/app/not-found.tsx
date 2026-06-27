import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <main className="not-found">
      <section className="not-found-card">
        <h1>Lost orbit.</h1>
        <p>The route you requested is outside the current Tether flight path.</p>
        <Link className="button button-light" href="/">
          Return home
          <ArrowRight size={18} />
        </Link>
      </section>
    </main>
  );
}
