import { MetricSummary, SocialPost } from "@/app/lib/types";

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
