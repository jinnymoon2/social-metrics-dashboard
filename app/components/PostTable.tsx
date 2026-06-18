"use client";

import { Trash2 } from "lucide-react";
import { calculateEngagementRate, formatNumber } from "@/app/lib/metrics";
import { SocialPost } from "@/app/lib/types";

type PostTableProps = {
  posts: SocialPost[];
  onDeletePost: (id: string) => void;
};

export default function PostTable({ posts, onDeletePost }: PostTableProps) {
  const sortedPosts = [...posts].sort((a, b) => b.views - a.views);

  if (sortedPosts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-slate-950">No posts found</h2>
        <p className="mt-2 text-sm text-slate-500">
          Add your first Instagram, LinkedIn, X, or OKKY post above.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-950">Tracked posts</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sorted by highest viewer count.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Platform</th>
              <th className="px-5 py-3 font-semibold">Post</th>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Views</th>
              <th className="px-5 py-3 font-semibold">Likes</th>
              <th className="px-5 py-3 font-semibold">Comments</th>
              <th className="px-5 py-3 font-semibold">Shares</th>
              <th className="px-5 py-3 font-semibold">Engagement</th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedPosts.map((post) => (
              <tr key={post.id} className="text-sm">
                <td className="px-5 py-4 font-semibold text-slate-950">
                  {post.platform}
                </td>
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-950">
                    {post.title}
                  </div>
                  {post.url ? (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block max-w-[320px] truncate text-xs text-slate-500 underline"
                    >
                      {post.url}
                    </a>
                  ) : null}
                  {post.notes ? (
                    <p className="mt-1 max-w-[320px] text-xs text-slate-500">
                      {post.notes}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-slate-600">{post.publishedAt}</td>
                <td className="px-5 py-4 font-semibold text-slate-950">
                  {formatNumber(post.views)}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {formatNumber(post.likes)}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {formatNumber(post.comments)}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {formatNumber(post.shares)}
                </td>
                <td className="px-5 py-4 font-semibold text-slate-950">
                  {calculateEngagementRate(post)}%
                </td>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => onDeletePost(post.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-200 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
