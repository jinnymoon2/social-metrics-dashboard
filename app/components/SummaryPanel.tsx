import MetricCard from "@/app/components/MetricCard";
import { calculateSummary, formatNumber } from "@/app/lib/metrics";
import { SocialPost } from "@/app/lib/types";

type SummaryPanelProps = {
  posts: SocialPost[];
};

export default function SummaryPanel({ posts }: SummaryPanelProps) {
  const summary = calculateSummary(posts);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <MetricCard
        label="Posts"
        value={formatNumber(summary.totalPosts)}
        description="Tracked posts"
      />
      <MetricCard
        label="Views"
        value={formatNumber(summary.totalViews)}
        description="Total viewer count"
      />
      <MetricCard
        label="Likes"
        value={formatNumber(summary.totalLikes)}
        description="Total likes"
      />
      <MetricCard
        label="Comments"
        value={formatNumber(summary.totalComments)}
        description="Total comments"
      />
      <MetricCard
        label="Shares"
        value={formatNumber(summary.totalShares)}
        description="Total shares/reposts"
      />
      <MetricCard
        label="Avg. engagement"
        value={`${summary.averageEngagementRate}%`}
        description="Average per post"
      />
    </section>
  );
}
