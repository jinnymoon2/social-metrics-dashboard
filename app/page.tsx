"use client";

import { useEffect, useMemo, useState } from "react";
import PlatformFilter from "@/app/components/PlatformFilter";
import PostForm from "@/app/components/PostForm";
import PostTable from "@/app/components/PostTable";
import SummaryPanel from "@/app/components/SummaryPanel";
import { seedPosts } from "@/app/lib/seed-posts";
import { Platform, SocialPost } from "@/app/lib/types";

const STORAGE_KEY = "social-metrics-dashboard-posts";

export default function Home() {
  const [posts, setPosts] = useState<SocialPost[]>(seedPosts);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | "All">(
    "All"
  );
  const [isImportingInstagram, setIsImportingInstagram] = useState(false);
  const [instagramStatus, setInstagramStatus] = useState("");

  useEffect(() => {
    const savedPosts = window.localStorage.getItem(STORAGE_KEY);

    if (savedPosts) {
      try {
        const parsedPosts = JSON.parse(savedPosts) as SocialPost[];
        setPosts(parsedPosts);
      } catch {
        setPosts(seedPosts);
      }
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("instagram") === "connected") {
      setInstagramStatus("Instagram connected successfully.");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedPlatform === "All") {
      return posts;
    }

    return posts.filter((post) => post.platform === selectedPlatform);
  }, [posts, selectedPlatform]);

  function handleAddPost(post: SocialPost) {
    setPosts((currentPosts) => [post, ...currentPosts]);
  }

  function handleDeletePost(id: string) {
    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== id));
  }

  function handleResetData() {
    setPosts(seedPosts);
    setSelectedPlatform("All");
  }

  async function handleImportInstagram() {
    setIsImportingInstagram(true);
    setInstagramStatus("");

    try {
      const response = await fetch("/api/instagram/media");
      const data = await response.json();

      if (!response.ok) {
        setInstagramStatus(data.error || "Failed to import Instagram posts.");
        return;
      }

      const importedPosts = data.posts as SocialPost[];

      setPosts((currentPosts) => {
        const currentIds = new Set(currentPosts.map((post) => post.id));
        const newPosts = importedPosts.filter((post) => !currentIds.has(post.id));

        return [...newPosts, ...currentPosts];
      });

      setInstagramStatus(`Imported ${importedPosts.length} Instagram posts.`);
    } catch {
      setInstagramStatus("Failed to import Instagram posts.");
    } finally {
      setIsImportingInstagram(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Social Metrics Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Track viewer count and likes across your posts
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Manual-first dashboard for Instagram, LinkedIn, X, and OKKY.
              Instagram can now be connected directly without Facebook Login.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/api/instagram/login"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
            >
              Connect Instagram
            </a>

            <button
              type="button"
              onClick={handleImportInstagram}
              disabled={isImportingInstagram}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImportingInstagram ? "Importing..." : "Import Instagram posts"}
            </button>

            <button
              type="button"
              onClick={handleResetData}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-400"
            >
              Reset sample data
            </button>
          </div>
        </header>

        {instagramStatus ? (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">
            {instagramStatus}
          </section>
        ) : null}

        <section className="mt-8">
          <SummaryPanel posts={filteredPosts} />
        </section>

        <section className="mt-8">
          <PostForm onAddPost={handleAddPost} />
        </section>

        <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Filter by platform
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Current view: {selectedPlatform}
            </p>
          </div>

          <PlatformFilter
            selectedPlatform={selectedPlatform}
            onChange={setSelectedPlatform}
          />
        </section>

        <section className="mt-8">
          <PostTable posts={filteredPosts} onDeletePost={handleDeletePost} />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">API notes</h2>
          <p className="mt-2">
            Instagram direct login imports media, captions, links, likes, and
            comments. Viewer count and deeper insights require insight-specific
            API calls and eligible permissions.
          </p>
        </section>
      </div>
    </main>
  );
}
