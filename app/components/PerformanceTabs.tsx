"use client";

import { useState } from "react";
import {
  Film,
  Image as ImageIcon,
  TrendingUp,
  type LucideIcon
} from "lucide-react";
import TrendsPanel from "@/app/components/TrendsPanel";
import { splitPostsByReel } from "@/app/lib/metrics";
import { SocialPost } from "@/app/lib/types";

type Tab = "posts" | "reels";

type PerformanceTabsProps = {
  posts: SocialPost[];
};

export default function PerformanceTabs({ posts }: PerformanceTabsProps) {
  const { posts: regularPosts, reels } = splitPostsByReel(posts);
  const [activeTab, setActiveTab] = useState<Tab>("posts");

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
    icon: LucideIcon;
  }> = [
    {
      id: "posts",
      label: "Posts",
      count: regularPosts.length,
      icon: ImageIcon
    },
    {
      id: "reels",
      label: "Reels",
      count: reels.length,
      icon: Film
    }
  ];

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <p className="eyebrow">Performance over time</p>
          <h2>Daily metrics by content type</h2>
          <p className="description">
            Switch between posts and reels to compare how each format performs
            day by day.
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
              aria-controls={`perf-panel-${tab.id}`}
              id={`perf-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`perfTabButton${isActive ? " is-active" : ""}`}
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
        id={`perf-panel-${fallbackTab}`}
        aria-labelledby={`perf-tab-${fallbackTab}`}
      >
        {fallbackTab === "reels" ? (
          <TrendsPanel
            posts={reels}
            title="Reels performance"
            subtitle="Daily totals across all reels."
            emptyMessage="No reels imported yet."
          />
        ) : (
          <TrendsPanel
            posts={regularPosts}
            title="Posts performance"
            subtitle="Daily totals across images, videos, and carousels."
            emptyMessage="No non-reel posts imported yet."
          />
        )}
      </div>
    </section>
  );
}
