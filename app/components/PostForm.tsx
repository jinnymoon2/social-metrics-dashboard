"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Platform, SocialPost } from "@/app/lib/types";

const platformOptions: Platform[] = ["Instagram", "LinkedIn", "X", "OKKY"];

type PostFormProps = {
  onAddPost: (post: SocialPost) => void;
};

export default function PostForm({ onAddPost }: PostFormProps) {
  const [platform, setPlatform] = useState<Platform>("Instagram");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [notes, setNotes] = useState("");

  function parseMetric(value: string): number {
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }

    return parsed;
  }

  function resetForm() {
    setPlatform("Instagram");
    setTitle("");
    setUrl("");
    setPublishedAt("");
    setViews("");
    setLikes("");
    setComments("");
    setShares("");
    setNotes("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    const newPost: SocialPost = {
      id: crypto.randomUUID(),
      platform,
      title: title.trim(),
      url: url.trim(),
      publishedAt: publishedAt || new Date().toISOString().slice(0, 10),
      views: parseMetric(views),
      likes: parseMetric(likes),
      comments: parseMetric(comments),
      shares: parseMetric(shares),
      notes: notes.trim()
    };

    onAddPost(newPost);
    resetForm();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Add post metrics</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter metrics manually until each platform API is connected.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Platform
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-slate-950"
          >
            {platformOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Post title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Aline.team launch post"
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Post URL
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Published date
          <input
            type="date"
            value={publishedAt}
            onChange={(event) => setPublishedAt(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Views
          <input
            type="number"
            min="0"
            value={views}
            onChange={(event) => setViews(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Likes
          <input
            type="number"
            min="0"
            value={likes}
            onChange={(event) => setLikes(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Comments
          <input
            type="number"
            min="0"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-950"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Shares
          <input
            type="number"
            min="0"
            value={shares}
            onChange={(event) => setShares(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-950"
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
        Notes
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional campaign note"
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-950"
        />
      </label>

      <button
        type="submit"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
      >
        <Plus size={16} />
        Add post
      </button>
    </form>
  );
}
