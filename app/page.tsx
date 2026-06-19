import Dashboard from "@/app/components/Dashboard";
import { seedPosts } from "@/app/lib/seed-posts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomePageProps = {
  searchParams?: Promise<{
    code?: string;
    error?: string;
    error_reason?: string;
    error_description?: string;
    error_message?: string;
    instagram?: string;
  }>;
};

function getEnvRedirectUri(): string {
  const value = process.env.INSTAGRAM_REDIRECT_URI;
  if (value && value.trim()) {
    return value.trim();
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL;
  if (fallback && fallback.trim()) {
    return fallback.trim();
  }
  return "";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : {};
  const redirectUri = getEnvRedirectUri();

  return (
    <Dashboard
      initialPosts={seedPosts}
      initialCode={params.code ?? null}
      initialError={params.error ?? params.error_reason ?? null}
      initialErrorDescription={
        params.error_description ?? params.error_message ?? null
      }
      instagramRedirectUri={redirectUri}
      justConnectedParam={params.instagram ?? null}
    />
  );
}
