import { Suspense } from "react";
import InstagramConnectionPanel from "@/app/components/InstagramConnectionPanel";

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Social Metrics Dashboard</p>
        <h1>Track social account metrics in one dashboard</h1>
        <p>
          Connect Instagram first, then expand the dashboard with YouTube,
          LinkedIn, X, and other platform metrics.
        </p>
      </section>

      <Suspense fallback={<div className="card">Loading Instagram connection...</div>}>
        <InstagramConnectionPanel />
      </Suspense>
    </main>
  );
}
