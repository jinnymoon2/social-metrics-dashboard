"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import PlatformFilter from "@/app/components/PlatformFilter";
import PostForm from "@/app/components/PostForm";
import PostTable from "@/app/components/PostTable";
import TrendsPanel from "@/app/components/TrendsPanel";
import HashtagLeaderboard from "@/app/components/HashtagLeaderboard";
import InstagramConnectionPanel from "@/app/components/InstagramConnectionPanel";
import { Platform, SocialPost } from "@/app/lib/types";
import { splitPostsByReel } from "@/app/lib/metrics";

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

const INSTAGRAM_POSTS_KEY = "social_metrics_instagram_posts";
const INSTAGRAM_FETCHED_KEY = "social_metrics_instagram_fetched";

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
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | "All">("All");

  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramUserId, setInstagramUserId] = useState<string | null>(null);
  const [instagramSyncing, setInstagramSyncing] = useState(false);
  const [instagramSyncError, setInstagramSyncError] = useState<string | null>(null);
  const [instagramFetchedAt, setInstagramFetchedAt] = useState<string | null>(null);
  const [instagramImportedCount, setInstagramImportedCount] = useState(0);

  // On mount, hydrate any cached Instagram posts from localStorage so the user
  // does not have to wait for a fresh fetch on every page load.
  useEffect(() => {
    const stored = readStoredInstagramPosts();
    if (stored.length > 0) {
      setPosts((current) => {
        const merged = new Map<string, SocialPost>();
        for (const post of current) merged.set(post.id, post);
        for (const post of stored) merged.set(post.id, post);
        return Array.from(merged.values());
      });
      setInstagramImportedCount(stored.length);
      setInstagramFetchedAt(readStoredFetchedAt());
    }
  }, []);

  const fetchInstagramMedia = useCallback(async () => {
    setInstagramSyncing(true);
    setInstagramSyncError(null);
    try {
      const response = await fetch("/api/instagram/media", { cache: "no-store" });
      const data = (await response.json()) as InstagramMediaResponse;
      if (!response.ok || !data.posts) {
        throw new Error(data.error || "Failed to fetch Instagram media");
      }
      const imported = data.posts;
      setPosts((current) => {
        const merged = new Map<string, SocialPost>();
        // Keep manual entries first, then layer imported ones (they overwrite
        // by id so re-imports refresh metrics).
        for (const post of current) {
          if (!post.id.startsWith("instagram-")) merged.set(post.id, post);
        }
        for (const post of imported) merged.set(post.id, post);
        return Array.from(merged.values());
      });
      setInstagramImportedCount(imported.length);
      const fetchedAt = data.fetchedAt || new Date().toISOString();
      setInstagramFetchedAt(fetchedAt);
      try {
        window.localStorage.setItem(INSTAGRAM_POSTS_KEY, JSON.stringify(imported));
        window.localStorage.setItem(INSTAGRAM_FETCHED_KEY, fetchedAt);
      } catch {
        // localStorage may be unavailable (private mode, quota); fail silently.
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram sync failed";
      setInstagramSyncError(message);
    } finally {
      setInstagramSyncing(false);
    }
  }, []);

  // Check Instagram connection status. If the callback redirected us back with
  // ?instagram=connected, give it a moment and then auto-sync.
  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const response = await fetch("/api/instagram/status", { cache: "no-store" });
        const data = (await response.json()) as InstagramStatus;
        if (cancelled) return;
        setInstagramConnected(Boolean(data.connected));
        setInstagramUserId(data.userId || null);
      } catch {
        if (!cancelled) setInstagramConnected(false);
      }
    }

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // Whenever the connection flips on (e.g. user just came back from OAuth),
  // automatically pull media. Also auto-sync on a fresh ?instagram=connected
  // redirect so the user lands back on a populated dashboard.
  useEffect(() => {
    if (instagramConnected && !instagramSyncing) {
      const isFresh = justConnectedParam === "connected" || instagramImportedCount === 0;
      if (isFresh) fetchInstagramMedia();
    }
  }, [instagramConnected, instagramImportedCount, instagramSyncing, justConnectedParam, fetchInstagramMedia]);

  const filteredPosts = useMemo(() => {
    if (selectedPlatform === "All") return posts;
    return posts.filter((post) => post.platform === selectedPlatform);
  }, [posts, selectedPlatform]);

  const instagramPosts = useMemo(
    () => posts.filter((post) => post.platform === "Instagram"),
    [posts]
  );

  const postAndReelSplit = useMemo(
    () => splitPostsByReel(filteredPosts),
    [filteredPosts]
  );

  function handleAddPost(post: SocialPost) {
    setPosts((current) => [post, ...current]);
  }

  function handleDeletePost(id: string) {
    setPosts((current) => current.filter((post) => post.id !== id));
    if (id.startsWith("instagram-")) {
      try {
        const stored = readStoredInstagramPosts().filter((post) => post.id !== id);
        window.localStorage.setItem(INSTAGRAM_POSTS_KEY, JSON.stringify(stored));
        setInstagramImportedCount(stored.length);
      } catch {
        // ignore
      }
    }
  }

  function formatFetchedAt(value: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  }

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
      />

      {instagramConnected ? (
        <section className="card syncCard">
          <div className="cardHeader">
            <div>
              <p className="eyebrow">Instagram sync</p>
              <h2>
                {instagramImportedCount > 0
                  ? instagramImportedCount + " posts imported"
                  : "Ready to import posts"}
              </h2>
              <p className="description">
                {instagramImportedCount > 0
                  ? "Showing reels and posts pulled from your Instagram account via the Graph API."
                  : "Click Refresh to pull your latest reels and posts from Instagram."}
                {instagramFetchedAt ? " Last synced " + formatFetchedAt(instagramFetchedAt) + "." : null}
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
            <p className="syncMeta">Connected as Instagram user ID {instagramUserId}</p>
          ) : null}
        </section>
      ) : null}

      <div className="dashboardFilterRow">
        <PlatformFilter
          selectedPlatform={selectedPlatform}
          onChange={setSelectedPlatform}
        />
      </div>

<TrendsPanel
        posts={postAndReelSplit.posts}
        title="Posts performance over time"
        subtitle="Daily totals for images, videos, and carousels."
        emptyMessage="No non-reel posts yet. Once you publish or import Instagram images, videos, or carousels, this chart will fill in."
      />

      <TrendsPanel
        posts={postAndReelSplit.reels}
        title="Reels performance over time"
        subtitle="Daily totals for Instagram reels (uses the views metric)."
        emptyMessage="No reels yet. Once you publish or import Instagram reels, this chart will fill in."
      />

      <HashtagLeaderboard posts={instagramPosts} />

      <PostForm onAddPost={handleAddPost} />

      <PostTable posts={filteredPosts} onDeletePost={handleDeletePost} />
    </main>
  );
}
