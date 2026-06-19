"use client";

import { useMemo, useState } from "react";

type TrendTab = "posts" | "reels";

type TrendPost = {
  id?: string;
  title?: string;
  views?: number;
  createdAt?: string;
  mediaType?: string;
  mediaProductType?: string;
};

type TrendPoint = {
  dateKey: string;
  label: string;
  views: number;
};

function toNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function isReel(post: TrendPost): boolean {
  return (
    post.mediaProductType === "REELS" ||
    post.mediaType === "REELS" ||
    post.mediaType === "REEL"
  );
}

function getDateKey(value?: string): string {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toISOString().slice(0, 10);
}

function getDateLabel(dateKey: string): string {
  if (dateKey === "Unknown") return "Unknown";

  const date = new Date(`${dateKey}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildTrend(posts: TrendPost[], tab: TrendTab): TrendPoint[] {
  const filtered = posts.filter((post) => {
    const reel = isReel(post);
    return tab === "reels" ? reel : !reel;
  });

  const grouped = new Map<string, number>();

  for (const post of filtered) {
    const dateKey = getDateKey(post.createdAt);
    grouped.set(dateKey, toNumber(grouped.get(dateKey)) + toNumber(post.views));
  }

  return Array.from(grouped.entries())
    .map(([dateKey, views]) => ({
      dateKey,
      label: getDateLabel(dateKey),
      views,
    }))
    .sort((a, b) => {
      if (a.dateKey === "Unknown") return 1;
      if (b.dateKey === "Unknown") return -1;
      return a.dateKey.localeCompare(b.dateKey);
    });
}

function buildPolyline(points: TrendPoint[]) {
  const width = 720;
  const height = 260;
  const paddingX = 46;
  const paddingTop = 30;
  const paddingBottom = 44;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxViews = Math.max(...points.map((point) => point.views), 1);

  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : paddingX + (index / (points.length - 1)) * chartWidth;

    const y =
      paddingTop +
      chartHeight -
      (point.views / maxViews) * chartHeight;

    return {
      ...point,
      x,
      y,
    };
  });

  return {
    width,
    height,
    maxViews,
    coordinates,
    polyline: coordinates.map((point) => `${point.x},${point.y}`).join(" "),
  };
}

export function ViewsTrendCard({ posts }: { posts: TrendPost[] }) {
  const [activeTab, setActiveTab] = useState<TrendTab>("posts");

  const trend = useMemo(() => {
    return buildTrend(posts, activeTab);
  }, [posts, activeTab]);

  const chart = useMemo(() => {
    return buildPolyline(trend);
  }, [trend]);

  const totalViews = trend.reduce((sum, point) => sum + point.views, 0);
  const latestViews = trend.length > 0 ? trend[trend.length - 1].views : 0;

  return (
    <section className="viewsTrendCard">
      <div className="viewsTrendHeader">
        <div>
          <h3>Views trend</h3>
          <p>Daily view trend by content type.</p>
        </div>

        <div className="viewsTrendTabs">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={activeTab === "posts" ? "active" : ""}
          >
            Posts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reels")}
            className={activeTab === "reels" ? "active" : ""}
          >
            Reels
          </button>
        </div>
      </div>

      <div className="viewsTrendSummary">
        <div>
          <span>Total views</span>
          <strong>{formatNumber(totalViews)}</strong>
        </div>
        <div>
          <span>Latest day</span>
          <strong>{formatNumber(latestViews)}</strong>
        </div>
        <div>
          <span>Data points</span>
          <strong>{formatNumber(trend.length)}</strong>
        </div>
      </div>

      <div className="viewsTrendChartWrap">
        {trend.length === 0 ? (
          <div className="viewsTrendEmpty">
            No {activeTab} view trend data found yet.
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            className="viewsTrendChart"
            role="img"
            aria-label={`${activeTab} views trend chart`}
          >
            <line x1="46" y1="216" x2="674" y2="216" className="viewsTrendAxis" />
            <line x1="46" y1="30" x2="46" y2="216" className="viewsTrendAxis" />

            <line x1="46" y1="154" x2="674" y2="154" className="viewsTrendGrid" />
            <line x1="46" y1="92" x2="674" y2="92" className="viewsTrendGrid" />
            <line x1="46" y1="30" x2="674" y2="30" className="viewsTrendGrid" />

            <polyline
              points={chart.polyline}
              fill="none"
              className="viewsTrendLine"
            />

            {chart.coordinates.map((point) => (
              <g key={`${point.dateKey}-${point.views}`}>
                <circle cx={point.x} cy={point.y} r="5" className="viewsTrendDot" />
                <title>
                  {point.label}: {formatNumber(point.views)} views
                </title>
              </g>
            ))}

            {chart.coordinates.map((point, index) => {
              const shouldShow =
                chart.coordinates.length <= 8 ||
                index === 0 ||
                index === chart.coordinates.length - 1 ||
                index % Math.ceil(chart.coordinates.length / 6) === 0;

              if (!shouldShow) return null;

              return (
                <text
                  key={`${point.dateKey}-label`}
                  x={point.x}
                  y="242"
                  textAnchor="middle"
                  className="viewsTrendDateLabel"
                >
                  {point.label}
                </text>
              );
            })}

            <text x="40" y="34" textAnchor="end" className="viewsTrendValueLabel">
              {formatNumber(chart.maxViews)}
            </text>
            <text x="40" y="220" textAnchor="end" className="viewsTrendValueLabel">
              0
            </text>
          </svg>
        )}
      </div>
    </section>
  );
}
