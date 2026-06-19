import {
  DailyMetricPoint,
  HashtagStat,
  MetricSummary,
  SocialPost
} from "@/app/lib/types";

export function calculateEngagementRate(post: SocialPost): number {
  if (post.views <= 0) {
    return 0;
  }
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
  return new Intl.NumberFormat("en-US").format(value);
}

// Pulls #hashtags out of any free-form text. Returns normalized tags without the
// leading "#" and trimmed. Unicode letters/digits/underscore are allowed.
const HASHTAG_REGEX = /#([\\p{L}\\p{N}_]+)/gu;

export function extractHashtagsFromText(text: string | undefined | null): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  const matches = text.matchAll(HASHTAG_REGEX);
  for (const match of matches) {
    const tag = match[1].toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

// Returns the canonical hashtag list for a post: anything explicitly stored on
// hashtags, plus any #tags found in the title or notes.
export function getPostHashtags(post: SocialPost): string[] {
  const stored = (post.hashtags || [])
    .map((tag) => tag.replace(/^#/, "").toLowerCase().trim())
    .filter(Boolean);
  const fromText = extractHashtagsFromText(
    [post.title, post.notes].filter(Boolean).join(" ")
  );
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const tag of [...stored, ...fromText]) {
    if (!seen.has(tag)) {
      seen.add(tag);
      merged.push(tag);
    }
  }
  return merged;
}

export function aggregateHashtagStats(posts: SocialPost[]): HashtagStat[] {
  const buckets = new Map<string, HashtagStat>();
  for (const post of posts) {
    const tags = getPostHashtags(post);
    if (tags.length === 0) continue;
    for (const tag of tags) {
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
  const stats: HashtagStat[] = [];
  buckets.forEach((bucket) => {
    const engagementRate =
      bucket.totalViews > 0
        ? Number(
            (
              ((bucket.totalLikes + bucket.totalComments) / bucket.totalViews) *
              100
            ).toFixed(2)
          )
        : 0;
    stats.push({ ...bucket, averageEngagementRate: engagementRate });
  });
  return stats.sort(
    (a, b) =>
      b.totalViews - a.totalViews ||
      b.totalLikes - a.totalLikes ||
      a.hashtag.localeCompare(b.hashtag)
  );
}

// Aggregates posts by ISO date (YYYY-MM-DD). Posts with the same day collapse
// into a single point so the trend chart shows daily totals.
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
  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Moving-average smoothing for trend lines. Window of 1 returns the input
// unchanged; larger windows smooth out single-day spikes.
export function smoothSeries(values: number[], windowSize: number): number[] {
  const size = Math.max(1, Math.min(windowSize, values.length));
  const result: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - Math.floor((size - 1) / 2));
    const end = Math.min(values.length, start + size);
    let sum = 0;
    for (let j = start; j < end; j += 1) {
      sum += values[j];
    }
    result.push(sum / (end - start));
  }
  return result;
}

// Instagram "REEL" is the only media type we surface as a reel. Videos, images,
// carousels, and IGTV posts are bucketed as posts.
export function isReelPost(post: SocialPost): boolean {
  return (post.mediaType || "").toUpperCase() === "REEL";
}

export function isRegularPost(post: SocialPost): boolean {
  return !isReelPost(post);
}

// Splits a post list into reels and non-reels, preserving identity.
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
