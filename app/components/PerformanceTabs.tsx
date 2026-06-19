"use client";

import { useState } from "react";
import { Film, Image as ImageIcon, TrendingUp } from "lucide-react";
import TrendsPanel from "@/app/components/TrendsPanel";
import { SocialPost } from "@/app/lib/types";
import { splitPostsByReel } from "@/app/lib/metrics";

type Tab = "posts" | "reels";

type PerformanceTabsProps = {
  posts: SocialPost[];
};

export default function PerformanceTabs({ posts }: PerformanceTabsProps) {
  const { posts: regularPosts, reels } = splitPostsByReel(posts);
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  // If the active tab is empty, fall back to whichever has data so the user
  // doesn't land on an empty chart with no obvious next step.
  const fallbackTab: Tab =
    activeTab === "reels" && reels.length === 0 && regularPosts.length > 0
      ? "posts"
      : activeTab === "posts" && regularPosts.length === 0 && reels.length > 0
        ? "reels"
        : activeTab;

  const tabs: Array<{
    id: Tab;
    label: string;
    count: number;
    icon: typeof Film;
  }> = [
    { id: "posts", label: "Posts", count: regularPosts.length, icon: ImageIcon },
    { id: "reels", label: "Reels", count: reels.length, icon: Film }
  ];

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <p className="eyebrow">Performance over time</p>
          <h2>Daily metrics by content type</h2>
          <p className="description">
            Switch between posts and reels to compare how each format performs day by day.
            Hover any point on the chart to see views, likes, and comments for that day.
          </p>
        </div>
        <span className="statusBadge connected">
          <TrendingUp size={14} style={{ marginRight: 6 }} />
          {regularPosts.length + reels.length}{" "}
          {regularPosts.length + reels.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div
        className="perfTabs"
        role="tablist"
        aria-label="Performance by content type"
      >
        {tabs.map((tab) => {
          const isActive = fallbackTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={"perf-panel-" + tab.id}
              id={"perf-tab-" + tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={"perfTabButton" + (isActive ? " is-active" : "")}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span className="perfTabCount">{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={"perf-panel-" + fallbackTab}
        aria-labelledby={"perf-tab-" + fallbackTab}
      >
        {fallbackTab === "reels" ? (
          <TrendsPanel
            posts={reels}
            title="Reels performance"
            subtitle="Daily totals across all your reels. The chart shows the metric you select below."
            emptyMessage="No reels imported yet. Once Instagram sync pulls your reels (media_type = REEL), this chart will fill in."
          />
        ) : (
          <TrendsPanel
            posts={regularPosts}
            title="Posts performance"
            subtitle="Daily totals across images, videos, and carousels. Views use the impressions metric from the Instagram Graph API."
            emptyMessage="No non-reel posts imported yet. Once Instagram sync pulls your images, videos, and carousels, this chart will fill in."
          />
        )}
      </div>
    </section>
  );
}
