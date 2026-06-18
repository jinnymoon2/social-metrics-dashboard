export type Platform = "Instagram" | "LinkedIn" | "X" | "OKKY";

export type SocialPost = {
  id: string;
  platform: Platform;
  title: string;
  url: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  notes?: string;
};

export type MetricSummary = {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  averageEngagementRate: number;
};
