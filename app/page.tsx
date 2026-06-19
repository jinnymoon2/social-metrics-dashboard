"use client";

import { useEffect, useMemo, useState } from "react";
import { ViewsTrendCard } from "./components/views-trend-card";

type PlatformKey = "instagram" | "okky";

type MetricPost = {
  id?: string;
  title?: string;
  url?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  createdAt?: string;
  mediaType?: string;
  mediaProductType?: string;
};

type PlatformMetrics = {
  platform: PlatformKey;
  profileUrl?: string;
  username?: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  postCount: number;
  engagementRate: number;
  updatedAt?: string;
  posts: MetricPost[];
};

type InstagramStatus = {
  connected: boolean;
  userId?: string | null;
};

const PLATFORM_CONFIG: Record<
  PlatformKey,
  {
    label: string;
    description: string;
    endpoints: string[];
  }
> = {
  instagram: {
    label: "Instagram",
    description: "Instagram post and account metrics",
    endpoints: ["/api/instagram/metrics"],
  },
  okky: {
    label: "OKKY",
    description: "OKKY article metrics",
    endpoints: ["/api/okky/metrics", "/api/okky", "/api/metrics/okky"],
  },
};

const PLATFORM_ORDER: PlatformKey[] = ["instagram", "okky"];

const LOCKED_INSTAGRAM_METRICS: PlatformMetrics = {
  platform: "instagram",
  totalViews: 0,
  totalLikes: 0,
  totalComments: 0,
  totalShares: 0,
  totalSaves: 0,
  postCount: 0,
  engagementRate: 0,
  updatedAt: undefined,
  posts: [],
};

function toNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatNumber(value?: number): string {
  return new Intl.NumberFormat("en-US").format(toNumber(value));
}

function formatPercent(value?: number): string {
  return `${toNumber(value).toFixed(2)}%`;
}

function normalizePost(post: any, index: number): MetricPost {
  return {
    id: String(post.id ?? post.url ?? post.link ?? index),
    title:
      post.title ??
      post.caption ??
      post.text ??
      post.name ??
      `Content ${index + 1}`,
    url: post.url ?? post.link ?? post.permalink,
    views: toNumber(post.views ?? post.viewCount ?? post.impressions ?? post.reach),
    likes: toNumber(post.likes ?? post.likeCount),
    comments: toNumber(post.comments ?? post.commentCount),
    shares: toNumber(post.shares ?? post.shareCount),
    saves: toNumber(post.saves ?? post.saveCount),
    createdAt: post.createdAt ?? post.created_time ?? post.date ?? post.publishedAt,
    mediaType: post.mediaType ?? post.media_type,
    mediaProductType: post.mediaProductType ?? post.media_product_type,
  };
}

function normalizeMetrics(platform: PlatformKey, rawData: any): PlatformMetrics {
  const data = rawData?.metrics ?? rawData?.data ?? rawData ?? {};

  const rawPosts =
    data.posts ??
    data.items ??
    data.articles ??
    data.results ??
    rawData?.posts ??
    rawData?.items ??
    rawData?.articles ??
    [];

  const posts = Array.isArray(rawPosts)
    ? rawPosts.map((post, index) => normalizePost(post, index))
    : [];

  const totalViews =
    data.totalViews ??
    data.views ??
    data.viewCount ??
    data.impressions ??
    posts.reduce((sum, post) => sum + toNumber(post.views), 0);

  const totalLikes =
    data.totalLikes ??
    data.likes ??
    data.likeCount ??
    posts.reduce((sum, post) => sum + toNumber(post.likes), 0);

  const totalComments =
    data.totalComments ??
    data.comments ??
    data.commentCount ??
    posts.reduce((sum, post) => sum + toNumber(post.comments), 0);

  const totalShares =
    data.totalShares ??
    data.shares ??
    data.shareCount ??
    posts.reduce((sum, post) => sum + toNumber(post.shares), 0);

  const totalSaves =
    data.totalSaves ??
    data.saves ??
    data.saveCount ??
    posts.reduce((sum, post) => sum + toNumber(post.saves), 0);

  const engagementRate =
    data.engagementRate ??
    data.engagement ??
    (toNumber(totalViews) > 0
      ? ((toNumber(totalLikes) +
          toNumber(totalComments) +
          toNumber(totalShares) +
          toNumber(totalSaves)) /
          toNumber(totalViews)) *
        100
      : 0);

  return {
    platform,
    profileUrl: data.profileUrl ?? data.profile_url ?? data.url,
    username: data.username ?? data.handle ?? data.account,
    totalViews: toNumber(totalViews),
    totalLikes: toNumber(totalLikes),
    totalComments: toNumber(totalComments),
    totalShares: toNumber(totalShares),
    totalSaves: toNumber(totalSaves),
    postCount: toNumber(data.postCount ?? data.postsCount ?? data.count ?? posts.length),
    engagementRate: toNumber(engagementRate),
    updatedAt: data.updatedAt ?? data.syncedAt ?? rawData?.updatedAt ?? rawData?.syncedAt,
    posts,
  };
}

async function fetchPlatformMetrics(platform: PlatformKey): Promise<PlatformMetrics> {
  const config = PLATFORM_CONFIG[platform];
  let lastError = "";

  for (const endpoint of config.endpoints) {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok) {
        lastError = data?.error || `${endpoint} returned ${response.status}`;
        continue;
      }

      return normalizeMetrics(platform, data);
    } catch (error) {
      lastError = error instanceof Error ? error.message : `Failed to fetch ${endpoint}`;
    }
  }

  throw new Error(lastError || `Could not load ${config.label} metrics.`);
}

async function getInstagramStatus(): Promise<InstagramStatus> {
  const response = await fetch("/api/instagram/status", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    return {
      connected: false,
      userId: null,
    };
  }

  return response.json();
}

async function completeInstagramOAuth(code: string, state: string) {
  const response = await fetch("/api/instagram/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      code,
      state,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data?.error || "Instagram login failed.");
  }

  return data;
}

export default function HomePage() {
  const [activePlatform, setActivePlatform] = useState<PlatformKey>("instagram");
  const [isCompletingInstagram, setIsCompletingInstagram] = useState(false);

  const [instagramStatus, setInstagramStatus] = useState<InstagramStatus>({
    connected: false,
    userId: null,
  });

  const [metrics, setMetrics] = useState<Record<PlatformKey, PlatformMetrics | null>>({
    instagram: null,
    okky: null,
  });

  const [loading, setLoading] = useState<Record<PlatformKey, boolean>>({
    instagram: false,
    okky: false,
  });

  const [errors, setErrors] = useState<Record<PlatformKey, string | null>>({
    instagram: null,
    okky: null,
  });

  async function loadPlatform(platform: PlatformKey) {
    setLoading((current) => ({ ...current, [platform]: true }));
    setErrors((current) => ({ ...current, [platform]: null }));

    try {
      const result = await fetchPlatformMetrics(platform);
      setMetrics((current) => ({ ...current, [platform]: result }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [platform]: error instanceof Error ? error.message : "Failed to load metrics.",
      }));
    } finally {
      setLoading((current) => ({ ...current, [platform]: false }));
    }
  }

  async function refreshInstagramStatus() {
    const status = await getInstagramStatus();
    setInstagramStatus(status);
    return status;
  }

  async function disconnectInstagram() {
    await fetch("/api/instagram/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    setInstagramStatus({
      connected: false,
      userId: null,
    });

    setMetrics((current) => ({
      ...current,
      instagram: null,
    }));

    setErrors((current) => ({
      ...current,
      instagram: null,
    }));
  }

  useEffect(() => {
    async function initialize() {
      const params = new URLSearchParams(window.location.search);

      const code = params.get("code");
      const state = params.get("state");
      const oauthError = params.get("error") || params.get("error_reason");
      const oauthErrorDescription = params.get("error_description");

      if (oauthError) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);

        setErrors((current) => ({
          ...current,
          instagram: oauthErrorDescription || oauthError,
        }));

        loadPlatform("okky");
        return;
      }

      if (code && state) {
        setIsCompletingInstagram(true);
        setActivePlatform("instagram");

        try {
          await completeInstagramOAuth(code, state);

          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, "", cleanUrl);

          setInstagramStatus({
            connected: true,
            userId: null,
          });

          await loadPlatform("instagram");
        } catch (error) {
          setErrors((current) => ({
            ...current,
            instagram:
              error instanceof Error
                ? error.message
                : "Instagram login failed.",
          }));
        } finally {
          setIsCompletingInstagram(false);
        }

        loadPlatform("okky");
        return;
      }

      const status = await refreshInstagramStatus();

      if (status.connected) {
        loadPlatform("instagram");
      }

      loadPlatform("okky");
    }

    initialize();
  }, []);

  useEffect(() => {
    if (activePlatform === "instagram" && instagramStatus.connected && !metrics.instagram) {
      loadPlatform("instagram");
    }

    if (activePlatform === "okky" && !metrics.okky) {
      loadPlatform("okky");
    }
  }, [activePlatform, instagramStatus.connected]);

  const activeConfig = PLATFORM_CONFIG[activePlatform];

  const activeMetrics =
    activePlatform === "instagram" && !instagramStatus.connected
      ? LOCKED_INSTAGRAM_METRICS
      : metrics[activePlatform];

  const activeLoading =
    activePlatform === "instagram"
      ? loading.instagram || isCompletingInstagram
      : loading[activePlatform];

  const activeError = errors[activePlatform];

  const tablePosts = useMemo(() => {
    return activeMetrics?.posts ?? [];
  }, [activeMetrics]);

  const isInstagramLocked =
    activePlatform === "instagram" && !instagramStatus.connected;

  return (
    <main className="socialDashboardShell">
      <aside className="socialSidebar">
        <div className="socialSidebarBrand">
          <h1>Social Metrics</h1>
          <p>Instagram and OKKY only</p>
        </div>

        <nav className="socialSidebarTabs">
          {PLATFORM_ORDER.map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            const isActive = activePlatform === platform;

            return (
              <button
                key={platform}
                type="button"
                onClick={() => setActivePlatform(platform)}
                className={isActive ? "socialSidebarTab active" : "socialSidebarTab"}
              >
                <span>{config.label}</span>
                <small>{config.description}</small>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="socialDashboardMain">
        <header className="socialDashboardHeader">
          <div>
            <p className="socialEyebrow">Platform</p>
            <h2>{activeConfig.label}</h2>
            <p>{activeConfig.description}</p>
          </div>

          <div className="socialHeaderActions">
            {activePlatform === "instagram" && !instagramStatus.connected && (
              <a href="/api/instagram/login" className="socialPrimaryButton">
                Connect Instagram
              </a>
            )}

            {activePlatform === "instagram" && instagramStatus.connected && (
              <>
                <button
                  type="button"
                  onClick={() => loadPlatform("instagram")}
                  className="socialSecondaryButton"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={disconnectInstagram}
                  className="socialSecondaryButton"
                >
                  Disconnect
                </button>
              </>
            )}

            {activePlatform === "okky" && (
              <button
                type="button"
                onClick={() => loadPlatform("okky")}
                className="socialSecondaryButton"
              >
                Refresh
              </button>
            )}

            {activeMetrics?.profileUrl && (
              <a
                href={activeMetrics.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="socialProfileButton"
              >
                Open profile
              </a>
            )}
          </div>
        </header>

        {isInstagramLocked && (
          <div className="socialConnectBanner">
            <div>
              <strong>Connect Instagram to unlock real metrics.</strong>
              <p>
                You will temporarily leave this page for Instagram login, then return
                here automatically with metrics loaded.
              </p>
            </div>

            <a href="/api/instagram/login" className="socialPrimaryButton">
              Connect Instagram
            </a>
          </div>
        )}

        {activeLoading && (
          <div className="socialStateCard">
            {isCompletingInstagram
              ? "Completing Instagram connection and loading metrics..."
              : `Loading ${activeConfig.label} metrics...`}
          </div>
        )}

        {!activeLoading && activeError && (
          <div className="socialStateCard error">
            <strong>Failed to load {activeConfig.label} metrics.</strong>
            <p>{activeError}</p>
          </div>
        )}

        {!activeLoading && !activeError && activeMetrics && (
          <>
            <section className={isInstagramLocked ? "socialMetricGrid locked" : "socialMetricGrid"}>
              <MetricCard label="Total views" value={formatNumber(activeMetrics.totalViews)} locked={isInstagramLocked} />
              <MetricCard label="Total likes" value={formatNumber(activeMetrics.totalLikes)} locked={isInstagramLocked} />
              <MetricCard label="Comments" value={formatNumber(activeMetrics.totalComments)} locked={isInstagramLocked} />
              <MetricCard label="Posts" value={formatNumber(activeMetrics.postCount)} locked={isInstagramLocked} />
              <MetricCard label="Shares" value={formatNumber(activeMetrics.totalShares)} locked={isInstagramLocked} />
              <MetricCard label="Saves" value={formatNumber(activeMetrics.totalSaves)} locked={isInstagramLocked} />
              <MetricCard label="Engagement rate" value={formatPercent(activeMetrics.engagementRate)} locked={isInstagramLocked} />
              <MetricCard
                label="Updated"
                value={
                  activeMetrics.updatedAt
                    ? new Date(activeMetrics.updatedAt).toLocaleString()
                    : isInstagramLocked
                      ? "Connect required"
                      : "Unknown"
                }
                locked={isInstagramLocked}
              />
            </section>

            {!isInstagramLocked && activePlatform === "instagram" && (
              <ViewsTrendCard posts={tablePosts} />
            )}

            <section className={isInstagramLocked ? "socialTableCard locked" : "socialTableCard"}>
              <div className="socialTableHeader">
                <div>
                  <h3>Content performance</h3>
                  <p>Latest {activeConfig.label} posts/articles</p>
                </div>
              </div>

              <div className="socialTableWrap">
                <table className="socialTable">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Views</th>
                      <th>Likes</th>
                      <th>Comments</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablePosts.length > 0 ? (
                      tablePosts.map((post, index) => (
                        <tr key={post.id ?? index}>
                          <td>
                            {post.url ? (
                              <a href={post.url} target="_blank" rel="noreferrer">
                                {post.title || "Untitled"}
                              </a>
                            ) : (
                              post.title || "Untitled"
                            )}
                          </td>
                          <td>{formatNumber(post.views)}</td>
                          <td>{formatNumber(post.likes)}</td>
                          <td>{formatNumber(post.comments)}</td>
                          <td>
                            {post.createdAt
                              ? new Date(post.createdAt).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="socialEmptyCell">
                          {isInstagramLocked
                            ? "Connect Instagram to load your real post metrics."
                            : "No content metrics found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  locked = false,
}: {
  label: string;
  value: string;
  locked?: boolean;
}) {
  return (
    <article className="socialMetricCard">
      <p>{label}</p>
      <strong>{locked ? "—" : value}</strong>
      {locked && <small>Connect required</small>}
    </article>
  );
}
