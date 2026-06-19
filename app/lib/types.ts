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
  hashtags?: string[];
  mediaType?: string;
};

export type MetricSummary = {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  averageEngagementRate: number;
};

export type HashtagStat = {
  hashtag: string;
  postCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  averageEngagementRate: number;
};

export type DailyMetricPoint = {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  posts: number;
};
