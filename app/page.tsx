import InstagramConnectionPanel from "@/app/components/InstagramConnectionPanel";

type HomePageProps = {
  searchParams?: Promise<{
    code?: string;
    error?: string;
    error_reason?: string;
    error_description?: string;
    error_message?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : {};

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

      <InstagramConnectionPanel
        initialCode={params.code ?? null}
        initialError={params.error ?? params.error_reason ?? null}
        initialErrorDescription={
          params.error_description ?? params.error_message ?? null
        }
      />
    </main>
  );
}
