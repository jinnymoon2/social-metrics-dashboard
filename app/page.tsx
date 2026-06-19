import Dashboard from "@/app/components/Dashboard";
import { seedPosts } from "@/app/lib/seed-posts";
import { resolveInstagramRedirectUri } from "@/app/lib/instagram";

type HomeProps = {
  searchParams?: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
    instagram?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  let instagramRedirectUri = "";

  try {
    instagramRedirectUri = resolveInstagramRedirectUri();
  } catch {
    instagramRedirectUri = "";
  }

  return (
    <Dashboard
      initialPosts={seedPosts}
      initialCode={params?.code || null}
      initialError={params?.error || null}
      initialErrorDescription={params?.error_description || null}
      instagramRedirectUri={instagramRedirectUri}
      justConnectedParam={params?.instagram || null}
    />
  );
}
