"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import PlatformFilter from "@/app/components/PlatformFilter";
import PostForm from "@/app/components/PostForm";
import PostTable from "@/app/components/PostTable";
import PerformanceTabs from "@/app/components/PerformanceTabs";
import HashtagLeaderboard from "@/app/components/HashtagLeaderboard";
import InstagramConnectionPanel from "@/app/components/InstagramConnectionPanel";
import SummaryPanel from "@/app/components/SummaryPanel";
import { Platform, SocialPost } from "@/app/lib/types";

type InstagramStatus = {
  connected: boolean;
  userId: string | null;
};

type InstagramMediaResponse = {
  posts?: SocialPost[];
  total?: number;
  fetchedAt?: string;
  error?: string;
};

const INSTAGRAM_POSTS_KEY = "social_metrics_instagram_posts_v2";
const INSTAGRAM_FETCHED_KEY = "social_metrics_instagram_fetched_v2";

type DashboardProps = {
  initialPosts: SocialPost[];
  initialCode: string | null;
  initialError: string | null;
  initialErrorDescription: string | null;
  instagramRedirectUri: string;
  justConnectedParam: string | null;
};

function readStoredInstagramPosts(): SocialPost[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(INSTAGRAM_POSTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SocialPost[]) : [];
  } catch {
    return [];
  }
}

function readStoredFetchedAt(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(INSTAGRAM_FETCHED_KEY);
  } catch {
    return null;
  }
}

export default function Dashboard({
  initialPosts,
  initialCode,
  initialError,
  initialErrorDescription,
  instagramRedirectUri,
  justConnectedParam
}: DashboardProps) {
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts);
  const [selectedPlatform, setSelectedPlatform] =
    useState<Platform | "All">("All");

  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramUserId, setInstagramUserId] = useState<string | null>(null);
  const [instagramSyncing, setInstagramSyncing] = useState(false);
  const [instagramSyncError, setInstagramSyncError] = useState<string | null>(
    null
  );
  const [instagramFetchedAt, setInstagramFetchedAt] = useState<string | null>(
    null
  );
  const [instagramImportedCount, setInstagramImportedCount] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.removeItem("social_metrics_instagram_posts");
      window.localStorage.removeItem("social_metrics_instagram_fetched");
    } catch {
      // Ignore unavailable storage.
    }
  }, []);

  useEffect(() => {
    const stored = readStoredInstagramPosts();

    if (stored.length === 0) return;

    setPosts((current: SocialPost[]) => {
      const merged = new Map<string, SocialPost>();

      for (const post of current) merged.set(post.id, post);
      for (const post of stored) merged.set(post.id, post);

      return Array.from(merged.values());
    });

    setInstagramImportedCount(stored.length);
    setInstagramFetchedAt(readStoredFetchedAt());
  }, []);

  const refreshInstagramStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/instagram/status", {
        cache: "no-store"
      });
      const data = (await response.json()) as InstagramStatus;

      setInstagramConnected(Boolean(data.connected));
      setInstagramUserId(data.userId || null);

      if (!data.connected) {
        setInstagramImportedCount(0);
        setInstagramFetchedAt(null);
      }

      return Boolean(data.connected);
    } catch {
      setInstagramConnected(false);
      setInstagramUserId(null);
      return false;
    }
  }, []);

  const fetchInstagramMedia = useCallback(async () => {
    setInstagramSyncing(true);
    setInstagramSyncError(null);

    try {
      const response = await fetch("/api/instagram/media", {
        cache: "no-store"
      });
      const data = (await response.json()) as InstagramMediaResponse;

      if (!response.ok || !data.posts) {
        throw new Error(data.error || "Failed to fetch Instagram media");
      }

      const imported = data.posts;

      setPosts((current: SocialPost[]) => {
        const merged = new Map<string, SocialPost>();

        for (const post of current) {
          if (!post.id.startsWith("instagram-")) merged.set(post.id, post);
        }

        for (const post of imported) merged.set(post.id, post);

        return Array.from(merged.values());
      });

      setInstagramImportedCount(imported.length);

      const fetchedAt = data.fetchedAt || new Date().toISOString();
      setInstagramFetchedAt(fetchedAt);

      window.localStorage.setItem(
        INSTAGRAM_POSTS_KEY,
        JSON.stringify(imported)
      );
      window.localStorage.setItem(INSTAGRAM_FETCHED_KEY, fetchedAt);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Instagram sync failed";
      setInstagramSyncError(message);
    } finally {
      setInstagramSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshInstagramStatus();
  }, [refreshInstagramStatus]);

  useEffect(() => {
    if (!instagramConnected || instagramSyncing) return;

    const shouldAutoSync =
      justConnectedParam === "connected" ||
      Boolean(initialCode) ||
      instagramImportedCount === 0;

    if (shouldAutoSync) fetchInstagramMedia();
  }, [
    fetchInstagramMedia,
    initialCode,
    instagramConnected,
    instagramImportedCount,
    instagramSyncing,
    justConnectedParam
  ]);

  function handleConnectionChange() {
    refreshInstagramStatus();
  }

  function handleAddPost(post: SocialPost) {
    setPosts((current: SocialPost[]) => [post, ...current]);
  }

  function handleDeletePost(id: string) {
    setPosts((current: SocialPost[]) =>
      current.filter((post: SocialPost) => post.id !== id)
    );

    if (!id.startsWith("instagram-")) return;

    try {
      const stored = readStoredInstagramPosts().filter(
        (post: SocialPost) => post.id !== id
      );
      window.localStorage.setItem(INSTAGRAM_POSTS_KEY, JSON.stringify(stored));
      setInstagramImportedCount(stored.length);
    } catch {
      // Ignore unavailable storage.
    }
  }

  function formatFetchedAt(value: string | null): string {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString();
  }

  const filteredPosts = useMemo(() => {
    if (selectedPlatform === "All") return posts;
    return posts.filter((post: SocialPost) => post.platform === selectedPlatform);
  }, [posts, selectedPlatform]);

  const instagramPosts = useMemo(
    () => posts.filter((post: SocialPost) => post.platform === "Instagram"),
    [posts]
  );

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
        initialCode={initialCode}
        initialError={initialError}
        initialErrorDescription={initialErrorDescription}
        instagramRedirectUri={instagramRedirectUri}
        onConnectionChange={handleConnectionChange}
      />

      {instagramConnected ? (
        <section className="card syncCard">
          <div className="cardHeader">
            <div>
              <p className="eyebrow">Instagram sync</p>
              <h2>
                {instagramImportedCount > 0
                  ? `${instagramImportedCount} posts imported`
                  : "Ready to import posts"}
              </h2>
              <p className="description">
                {instagramImportedCount > 0
                  ? "Showing reels and posts pulled from your Instagram account."
                  : "Click Refresh to pull your latest Instagram posts and reels."}
                {instagramFetchedAt
                  ? ` Last synced ${formatFetchedAt(instagramFetchedAt)}.`
                  : ""}
              </p>
            </div>

            <button
              type="button"
              className="primaryButton"
              onClick={fetchInstagramMedia}
              disabled={instagramSyncing}
            >
              <RefreshCw size={14} style={{ marginRight: 6 }} />
              {instagramSyncing ? "Syncing..." : "Refresh from Instagram"}
            </button>
          </div>

          {instagramSyncError ? (
            <div className="messageBox error">
              <p>{instagramSyncError}</p>
            </div>
          ) : null}

          {instagramUserId ? (
            <p className="syncMeta">
              Connected as Instagram user ID {instagramUserId}
            </p>
          ) : null}
        </section>
      ) : null}

      <SummaryPanel posts={filteredPosts} />

      <div className="dashboardFilterRow">
        <PlatformFilter
          selectedPlatform={selectedPlatform}
          onChange={setSelectedPlatform}
        />
      </div>

      <PerformanceTabs posts={filteredPosts} />

      <HashtagLeaderboard posts={instagramPosts} />

      <PostForm onAddPost={handleAddPost} />

      <PostTable posts={filteredPosts} onDeletePost={handleDeletePost} />
    </main>
  );
}
