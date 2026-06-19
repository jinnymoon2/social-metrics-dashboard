import {
  DailyMetricPoint,
  HashtagStat,
  MetricSummary,
  SocialPost
} from "@/app/lib/types";

export function calculateEngagementRate(post: SocialPost): number {
  if (post.views <= 0) return 0;

  const engagements = post.likes + post.comments + post.shares;
  return Number(((engagements / post.views) * 100).toFixed(2));
}

export function calculateSummary(posts: SocialPost[]): MetricSummary {
  const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
  const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
  const totalComments = posts.reduce((sum, post) => sum + post.comments, 0);
  const totalShares = posts.reduce((sum, post) => sum + post.shares, 0);

  const averageEngagementRate =
    posts.length === 0
      ? 0
      : Number(
          (
            posts.reduce((sum, post) => sum + calculateEngagementRate(post), 0) /
            posts.length
          ).toFixed(2)
        );

  return {
    totalPosts: posts.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    averageEngagementRate
  };
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(
    Number.isFinite(value) ? value : 0
  );
}

const HASHTAG_REGEX = /#([\p{L}\p{N}_]+)/gu;

export function extractHashtagsFromText(
  text: string | undefined | null
): string[] {
  if (!text) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const tag = match[1].toLowerCase().trim();
    if (!tag || seen.has(tag)) continue;

    seen.add(tag);
    result.push(tag);
  }

  return result;
}

export function getPostHashtags(post: SocialPost): string[] {
  const stored = (post.hashtags || [])
    .map((tag) => tag.replace(/^#/, "").toLowerCase().trim())
    .filter(Boolean);

  const fromText = extractHashtagsFromText(
    [post.title, post.notes].filter(Boolean).join(" ")
  );

  return Array.from(new Set([...stored, ...fromText]));
}

export function aggregateHashtagStats(posts: SocialPost[]): HashtagStat[] {
  const buckets = new Map<string, HashtagStat>();

  for (const post of posts) {
    for (const tag of getPostHashtags(post)) {
      const current = buckets.get(tag) || {
        hashtag: tag,
        postCount: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        averageEngagementRate: 0
      };

      current.postCount += 1;
      current.totalViews += post.views;
      current.totalLikes += post.likes;
      current.totalComments += post.comments;

      buckets.set(tag, current);
    }
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      ...bucket,
      averageEngagementRate:
        bucket.totalViews > 0
          ? Number(
              (
                ((bucket.totalLikes + bucket.totalComments) /
                  bucket.totalViews) *
                100
              ).toFixed(2)
            )
          : 0
    }))
    .sort(
      (a, b) =>
        b.totalViews - a.totalViews ||
        b.totalLikes - a.totalLikes ||
        a.hashtag.localeCompare(b.hashtag)
    );
}

export function aggregateDailyMetrics(posts: SocialPost[]): DailyMetricPoint[] {
  const buckets = new Map<string, DailyMetricPoint>();

  for (const post of posts) {
    const date = (post.publishedAt || "").slice(0, 10);
    if (!date) continue;

    const current = buckets.get(date) || {
      date,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      posts: 0
    };

    current.views += post.views;
    current.likes += post.likes;
    current.comments += post.comments;
    current.shares += post.shares;
    current.posts += 1;

    buckets.set(date, current);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

export function smoothSeries(values: number[], windowSize: number): number[] {
  if (values.length === 0) return [];

  const size = Math.max(1, Math.min(windowSize, values.length));
  const half = Math.floor(size / 2);

  return values.map((_, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(values.length, index + half + 1);
    const slice = values.slice(start, end);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

export function isReelPost(post: SocialPost): boolean {
  return (post.mediaType || "").toUpperCase() === "REEL";
}

export function splitPostsByReel(posts: SocialPost[]): {
  posts: SocialPost[];
  reels: SocialPost[];
} {
  const regular: SocialPost[] = [];
  const reels: SocialPost[] = [];

  for (const post of posts) {
    if (isReelPost(post)) reels.push(post);
    else regular.push(post);
  }

  return { posts: regular, reels };
}
