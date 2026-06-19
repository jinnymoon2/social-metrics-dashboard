"use client";

import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  aggregateDailyMetrics,
  formatNumber,
  smoothSeries
} from "@/app/lib/metrics";
import { SocialPost } from "@/app/lib/types";

type TrendMetric = "views" | "likes" | "comments" | "shares";
type SmoothingMode = "raw" | "smooth";

type MetricOption = {
  id: TrendMetric;
  label: string;
  color: string;
};

const METRIC_OPTIONS: MetricOption[] = [
  { id: "views", label: "Views", color: "#2563eb" },
  { id: "likes", label: "Likes", color: "#db2777" },
  { id: "comments", label: "Comments", color: "#0891b2" },
  { id: "shares", label: "Shares", color: "#ca8a04" }
];

const SMOOTH_OPTIONS: Array<{ id: SmoothingMode; label: string }> = [
  { id: "raw", label: "Daily" },
  { id: "smooth", label: "7-day avg" }
];

type TrendsPanelProps = {
  posts: SocialPost[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
};

const CHART_WIDTH = 720;
const CHART_HEIGHT = 280;
const PADDING_X = 44;
const PADDING_Y = 28;

function formatShortDate(value: string): string {
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[1]}/${parts[2]}`;
}

function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs >= 10) return value.toFixed(0);

  return value.toFixed(1);
}

export default function TrendsPanel({
  posts,
  title = "Performance over time",
  subtitle = "Daily totals across all tracked posts.",
  emptyMessage = "Add posts with a published date to see trends."
}: TrendsPanelProps) {
  const [metric, setMetric] = useState<TrendMetric>("views");
  const [smoothing, setSmoothing] = useState<SmoothingMode>("raw");

  const daily = useMemo(() => aggregateDailyMetrics(posts), [posts]);
  const activeOption =
    METRIC_OPTIONS.find((option) => option.id === metric) || METRIC_OPTIONS[0];

  const seriesValues = useMemo(() => {
    const values = daily.map((point) => point[metric]);
    return smoothing === "smooth" ? smoothSeries(values, 7) : values;
  }, [daily, metric, smoothing]);

  const totals = useMemo(
    () => ({
      views: daily.reduce((sum, point) => sum + point.views, 0),
      likes: daily.reduce((sum, point) => sum + point.likes, 0),
      comments: daily.reduce((sum, point) => sum + point.comments, 0),
      shares: daily.reduce((sum, point) => sum + point.shares, 0)
    }),
    [daily]
  );

  if (daily.length === 0) {
    return (
      <section className="card">
        <div className="cardHeader">
          <div>
            <p className="eyebrow">Trends</p>
            <h2>{title}</h2>
          </div>
          <span className="statusBadge idle">No data</span>
        </div>
        <p className="description">{emptyMessage}</p>
      </section>
    );
  }

  const peak = daily.reduce(
    (best, point) => (point[metric] > best[metric] ? point : best),
    daily[0]
  );

  const maxValue = Math.max(1, ...seriesValues);
  const innerWidth = CHART_WIDTH - PADDING_X * 2;
  const innerHeight = CHART_HEIGHT - PADDING_Y * 2;
  const stepX = daily.length > 1 ? innerWidth / (daily.length - 1) : 0;

  const points = seriesValues.map((value, index) => {
    const point = daily[index];
    const x = PADDING_X + index * stepX;
    const y = CHART_HEIGHT - PADDING_Y - (value / maxValue) * innerHeight;

    return {
      x,
      y,
      value,
      label: point.date,
      views: point.views,
      likes: point.likes,
      comments: point.comments,
      shares: point.shares,
      posts: point.posts
    };
  });

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`
    )
    .join(" ");

  const areaPath = `${linePath} L${points[
    points.length - 1
  ].x.toFixed(1)},${(CHART_HEIGHT - PADDING_Y).toFixed(1)} L${points[0].x.toFixed(
    1
  )},${(CHART_HEIGHT - PADDING_Y).toFixed(1)} Z`;

  const xTickIndices =
    daily.length <= 6
      ? daily.map((_, index) => index)
      : Array.from(
          new Set([
            ...daily
              .map((_, index) => index)
              .filter((index) => index % Math.ceil(daily.length / 6) === 0),
            daily.length - 1
          ])
        );

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <p className="eyebrow">Trends</p>
          <h2>{title}</h2>
        </div>

        <span className="statusBadge connected">
          <TrendingUp size={14} style={{ marginRight: 6 }} />
          {daily.length === 1 ? "1 day" : `${daily.length} days`}
        </span>
      </div>

      <p className="description">{subtitle}</p>

      <div className="chartControls">
        <div className="chartControlGroup">
          {METRIC_OPTIONS.map((option) => {
            const isActive = metric === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMetric(option.id)}
                className={`chartControlButton${isActive ? " is-active" : ""}`}
                style={
                  isActive
                    ? {
                        borderColor: option.color,
                        color: option.color,
                        background: `${option.color}14`
                      }
                    : undefined
                }
              >
                <span
                  className="chartControlDot"
                  style={{ background: option.color }}
                />
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="chartControlGroup">
          {SMOOTH_OPTIONS.map((option) => {
            const isActive = smoothing === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSmoothing(option.id)}
                className={`chartControlButton${isActive ? " is-active" : ""}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="chartStatRow">
        <div className="chartStat">
          <span>Total {activeOption.label.toLowerCase()}</span>
          <strong>{formatNumber(totals[metric])}</strong>
        </div>

        <div className="chartStat">
          <span>Daily average</span>
          <strong>{formatNumber(Math.round(totals[metric] / daily.length))}</strong>
        </div>

        <div className="chartStat">
          <span>Peak day</span>
          <strong>
            {formatShortDate(peak.date)} · {formatCompact(peak[metric])}
          </strong>
        </div>

        <div className="chartStat">
          <span>Posts</span>
          <strong>
            {formatNumber(daily.reduce((sum, point) => sum + point.posts, 0))}
          </strong>
        </div>
      </div>

      <div className="chartWrapper">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={`Trend chart for ${metric}`}
          preserveAspectRatio="none"
          className="chartSvg"
        >
          {Array.from({ length: 5 }).map((_, index) => {
            const ratio = index / 4;
            const y = CHART_HEIGHT - PADDING_Y - ratio * innerHeight;
            const value = ratio * maxValue;

            return (
              <g key={`y-${index}`}>
                <line
                  x1={PADDING_X}
                  x2={CHART_WIDTH - PADDING_X}
                  y1={y}
                  y2={y}
                  className="chartGridLine"
                />
                <text
                  x={PADDING_X - 8}
                  y={y + 4}
                  className="chartAxisLabel"
                  textAnchor="end"
                >
                  {formatCompact(value)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill={activeOption.color} fillOpacity="0.12" />
          <path
            d={linePath}
            fill="none"
            stroke={activeOption.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((point, index) => (
            <circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill="white"
              stroke={activeOption.color}
              strokeWidth="2"
            >
              <title>
                {[
                  `${point.label} · ${point.posts} ${
                    point.posts === 1 ? "post" : "posts"
                  }`,
                  `Views: ${formatNumber(point.views)}`,
                  `Likes: ${formatNumber(point.likes)}`,
                  `Comments: ${formatNumber(point.comments)}`,
                  `Shares: ${formatNumber(point.shares)}`
                ].join("\n")}
              </title>
            </circle>
          ))}

          {xTickIndices.map((index) => (
            <text
              key={`x-${index}`}
              x={PADDING_X + index * stepX}
              y={CHART_HEIGHT - 6}
              className="chartAxisLabel"
              textAnchor="middle"
            >
              {formatShortDate(daily[index].date)}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}
