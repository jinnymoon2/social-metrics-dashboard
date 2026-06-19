"use client";

import { Hash } from "lucide-react";
import { useMemo, useState } from "react";
import { aggregateHashtagStats, formatNumber } from "@/app/lib/metrics";
import { HashtagStat, SocialPost } from "@/app/lib/types";

type SortKey = "views" | "likes" | "engagement" | "posts";

type SortOption = {
  id: SortKey;
  label: string;
};

const SORT_OPTIONS: SortOption[] = [
  { id: "views", label: "Top views" },
  { id: "likes", label: "Top likes" },
  { id: "engagement", label: "Top engagement" },
  { id: "posts", label: "Most posts" }
];

type HashtagLeaderboardProps = {
  posts: SocialPost[];
};

function sortStats(stats: HashtagStat[], sortKey: SortKey): HashtagStat[] {
  const sorted = [...stats];
  sorted.sort((a, b) => {
    if (sortKey === "engagement") {
      return b.averageEngagementRate - a.averageEngagementRate || b.totalViews - a.totalViews;
    }
    if (sortKey === "posts") {
      return b.postCount - a.postCount || b.totalViews - a.totalViews;
    }
    const key = sortKey === "views" ? "totalViews" : "totalLikes";
    return (b[key] as number) - (a[key] as number);
  });
  return sorted;
}

export default function HashtagLeaderboard({ posts }: HashtagLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [limit, setLimit] = useState<number>(10);

  const stats = useMemo(() => aggregateHashtagStats(posts), [posts]);
  const sorted = useMemo(() => sortStats(stats, sortKey), [stats, sortKey]);

  if (stats.length === 0) {
    return (
      <section className="card">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">Hashtag performance</p>
            <h2>Hashtags driving views and likes</h2>
          </div>
          <span className="statusBadge idle">No tags yet</span>
        </div>
        <p className="description">
          Add hashtags when creating a post (e.g. #design #buildinpublic) or include them in the title or notes. We will rank them by views, likes, and engagement so you can see which tags actually move the needle.
        </p>
      </section>
    );
  }

  const maxViews = Math.max(1, ...stats.map((stat) => stat.totalViews));
  const maxLikes = Math.max(1, ...stats.map((stat) => stat.totalLikes));
  const visible = sorted.slice(0, limit);
  const limitOptions = [5, 10, 20];

  return (
    <section className="card">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">Hashtag performance</p>
            <h2>Hashtags driving views and likes</h2>
          </div>
          <span className="statusBadge connected">
            <Hash size={14} style={{ marginRight: 6 }} />
            {stats.length} {stats.length === 1 ? "tag" : "tags"}
          </span>
        </div>

      <p className="description">
        Rankings update from the hashtags attached to your posts. Engagement rate is (likes + comments) divided by views.
      </p>

      <div className="chartControls">
        <div className="chartControlGroup">
          {SORT_OPTIONS.map((option) => {
            const isActive = sortKey === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSortKey(option.id)}
                className={"chartControlButton" + (isActive ? " is-active" : "")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="chartControlGroup">
          {limitOptions.map((option) => {
            const isActive = limit === option;
            return (
              <button
                key={"limit-" + option}
                type="button"
                onClick={() => setLimit(option)}
                className={"chartControlButton" + (isActive ? " is-active" : "")}
              >
                Top {option}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="hashtagList">
        {visible.map((stat, index) => {
          const viewsWidth = (stat.totalViews / maxViews) * 100;
          const likesWidth = (stat.totalLikes / maxLikes) * 100;
          return (
            <li key={stat.hashtag} className="hashtagItem">
              <div className="hashtagHeader">
                <div className="hashtagTitle">
                  <span className="hashtagRank">#{index + 1}</span>
                  <span className="hashtagName">#{stat.hashtag}</span>
                </div>
                <div className="hashtagStats">
                  <span className="hashtagStat">
                    <span className="hashtagStatLabel">Posts</span>
                    <strong>{formatNumber(stat.postCount)}</strong>
                  </span>
                  <span className="hashtagStat">
                    <span className="hashtagStatLabel">Engagement</span>
                    <strong>{stat.averageEngagementRate}%</strong>
                  </span>
                </div>
              </div>

              <div className="hashtagBar">
                <div className="hashtagBarRow">
                  <span className="hashtagBarLabel">Views</span>
                  <div className="hashtagBarTrack">
                    <div className="hashtagBarFill" style={{ width: viewsWidth + "%", background: "#2563eb" }} />
                  </div>
                  <span className="hashtagBarValue">{formatNumber(stat.totalViews)}</span>
                </div>
                <div className="hashtagBarRow">
                  <span className="hashtagBarLabel">Likes</span>
                  <div className="hashtagBarTrack">
                    <div className="hashtagBarFill" style={{ width: likesWidth + "%", background: "#db2777" }} />
                  </div>
                  <span className="hashtagBarValue">{formatNumber(stat.totalLikes)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {sorted.length > limit ? (
        <p className="hashtagFooter">
          Showing {visible.length} of {sorted.length} hashtags.
        </p>
      ) : null}
    </section>
  );
}
