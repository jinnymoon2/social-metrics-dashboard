import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const START_URL = process.argv[2];
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const MAX_PAGES = Number(process.env.OKKY_MAX_PAGES || "40");
const MAX_POSTS = Number(process.env.OKKY_MAX_POSTS || "50");
const REQUEST_DELAY_MS = Number(process.env.OKKY_DELAY_MS || "900");

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, "data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "okky-snapshots.json");
const REPORT_JSON_FILE = path.join(DATA_DIR, "okky-report.json");
const REPORT_MD_FILE = path.join(DATA_DIR, "okky-report.md");

if (!START_URL) {
  console.error("");
  console.error("Missing OKKY URL.");
  console.error("");
  console.error("Usage:");
  console.error('  node scripts/okky-analyze.mjs "https://okky.kr/user/123/articles/456"');
  console.error('  node scripts/okky-analyze.mjs "https://okky.kr/user/123"');
  console.error("");
  process.exit(1);
}

function todayKstDate() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(rawUrl, baseUrl = "https://okky.kr") {
  try {
    const url = new URL(rawUrl, baseUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isOkkyUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "okky.kr" || parsed.hostname.endsWith(".okky.kr");
  } catch {
    return false;
  }
}

function extractUserId(url) {
  const match = url.match(/\/user\/(\d+)/);
  return match ? match[1] : null;
}

function extractPostInfo(url) {
  const direct = url.match(/\/(articles|questions)\/(\d+)/);
  if (direct) {
    return {
      type: direct[1],
      id: direct[2],
    };
  }

  const userNested = url.match(/\/user\/\d+\/(articles|questions)\/(\d+)/);
  if (userNested) {
    return {
      type: userNested[1],
      id: userNested[2],
    };
  }

  return null;
}

function isLikelyPostUrl(url, userId) {
  if (!isOkkyUrl(url)) {
    return false;
  }

  const parsed = new URL(url);
  const pathname = parsed.pathname;

  if (userId && pathname.includes(`/user/${userId}/articles/`)) {
    return true;
  }

  if (userId && pathname.includes(`/user/${userId}/questions/`)) {
    return true;
  }

  if (/\/articles\/\d+/.test(pathname)) {
    return true;
  }

  if (/\/questions\/\d+/.test(pathname)) {
    return true;
  }

  return false;
}

function isLikelyListingUrl(url, userId) {
  if (!isOkkyUrl(url)) {
    return false;
  }

  const parsed = new URL(url);
  const pathname = parsed.pathname;

  if (!userId) {
    return false;
  }

  if (pathname === `/user/${userId}`) {
    return true;
  }

  if (pathname === `/user/${userId}/articles`) {
    return true;
  }

  if (pathname === `/user/${userId}/questions`) {
    return true;
  }

  if (pathname.startsWith(`/user/${userId}`) && parsed.search) {
    return true;
  }

  return false;
}

async function fetchHtml(url) {
  await sleep(REQUEST_DELAY_MS);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 OKKYMetricsLocalAnalyzer/0.1 personal-use keyword-analysis",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}. Status ${response.status}`);
  }

  return response.text();
}

function extractLinks(html, baseUrl, userId) {
  const $ = cheerio.load(html);
  const links = new Set();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const normalized = normalizeUrl(href, baseUrl);

    if (!normalized || !isOkkyUrl(normalized)) {
      return;
    }

    if (isLikelyPostUrl(normalized, userId) || isLikelyListingUrl(normalized, userId)) {
      links.add(normalized);
    }
  });

  return [...links];
}

function extractTitle($) {
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const h1 = $("h1").first().text();
  const title = $("title").first().text();

  const value = ogTitle || h1 || title || "Untitled OKKY post";

  return normalizeWhitespace(
    value
      .replace(/\| OKKY.*$/i, "")
      .replace(/ - OKKY.*$/i, "")
  );
}

function extractMainText($) {
  $("script, style, noscript, svg").remove();

  const articleText =
    $("article").first().text() ||
    $("main").first().text() ||
    $("body").text();

  return normalizeWhitespace(articleText).slice(0, 6000);
}

function uniqueCleanList(values) {
  return [...new Set(
    values
      .map((value) => normalizeWhitespace(value))
      .map((value) => value.replace(/^#/, ""))
      .filter(Boolean)
      .filter((value) => value.length >= 2)
      .filter((value) => value.length <= 40)
  )];
}

function extractTags($, text) {
  const tagValues = [];

  $('a[href*="/topics/"], a[href*="/articles/tagged/"], a[href*="/questions/tagged/"]').each(
    (_, element) => {
      const value = $(element).text();
      if (value) tagValues.push(value);
    }
  );

  const hashMatches = text.match(/#[가-힣a-zA-Z0-9_.+-]+/g) || [];
  tagValues.push(...hashMatches);

  return uniqueCleanList(tagValues);
}

function parseNumber(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function extractCommentsCount(text) {
  const patterns = [
    /Comments?\s*([0-9,]+)/i,
    /댓글\s*([0-9,]+)/,
    /([0-9,]+)\s*개의\s*댓글/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseNumber(match[1]);
      if (parsed !== null) return parsed;
    }
  }

  return null;
}

function extractViewsCount(text) {
  const patterns = [
    /조회\s*수?\s*([0-9,]+)/,
    /조회\s*([0-9,]+)/,
    /([0-9,]+)\s*조회/,
    /Views?\s*([0-9,]+)/i,
    /view\s*count\s*([0-9,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseNumber(match[1]);
      if (parsed !== null) return parsed;
    }
  }

  return null;
}

function fallbackKeywordsFromText(input) {
  const stopwords = new Set([
    "그리고",
    "그러나",
    "하지만",
    "해서",
    "하는",
    "있는",
    "없는",
    "으로",
    "에서",
    "에게",
    "대한",
    "관련",
    "합니다",
    "입니다",
    "때문",
    "정도",
    "경우",
    "부분",
    "생각",
    "개발",
    "개발자",
    "OKKY",
    "okky",
  ]);

  const matches = String(input)
    .replace(/[^\p{L}\p{N}\s#+._-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^#/, "").trim())
    .filter((token) => token.length >= 2)
    .filter((token) => token.length <= 24)
    .filter((token) => !stopwords.has(token));

  const counts = new Map();

  for (const token of matches) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([keyword]) => keyword);
}

function safeJsonParseFromText(text) {
  const raw = String(text || "").trim();

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function extractKeywordsWithOllama({ title, tags, text }) {
  const prompt = `
You are analyzing an OKKY Korean developer community post.

Return strict JSON only.
No markdown.
No explanation.

Task:
Extract 5 to 12 keywords that would explain why this post attracts views.
Prefer Korean technical/community keywords.
Avoid generic words.

Title:
${title}

Tags:
${tags.join(", ") || "none"}

Content excerpt:
${text.slice(0, 2500)}

Return format:
{
  "keywords": ["keyword1", "keyword2"]
}
`.trim();

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama failed with status ${response.status}`);
    }

    const data = await response.json();
    const parsed = safeJsonParseFromText(data.response);

    if (parsed && Array.isArray(parsed.keywords)) {
      return uniqueCleanList(parsed.keywords).slice(0, 12);
    }

    return fallbackKeywordsFromText(`${title} ${tags.join(" ")} ${text}`);
  } catch (error) {
    console.warn("[ollama] keyword extraction failed, using fallback:", error.message);
    return fallbackKeywordsFromText(`${title} ${tags.join(" ")} ${text}`);
  }
}

async function parsePost(url, html) {
  const $ = cheerio.load(html);
  const title = extractTitle($);
  const text = extractMainText($);
  const tags = extractTags($, text);
  const postInfo = extractPostInfo(url);

  const totalViews = extractViewsCount(text);
  const commentsCount = extractCommentsCount(text);

  const keywords = await extractKeywordsWithOllama({
    title,
    tags,
    text,
  });

  return {
    url,
    okkyId: postInfo?.id || null,
    type: postInfo?.type || null,
    title,
    tags,
    keywords,
    totalViews,
    commentsCount,
    textSample: text.slice(0, 600),
    fetchedAt: new Date().toISOString(),
  };
}

async function crawlOkky(startUrl) {
  const normalizedStart = normalizeUrl(startUrl);

  if (!normalizedStart || !isOkkyUrl(normalizedStart)) {
    throw new Error("The URL must be an OKKY URL.");
  }

  const userId = extractUserId(normalizedStart);

  const queue = [];
  const visited = new Set();
  const postUrls = new Set();
  const posts = [];

  queue.push(normalizedStart);

  if (userId) {
    queue.push(`https://okky.kr/user/${userId}`);
    queue.push(`https://okky.kr/user/${userId}/articles`);
    queue.push(`https://okky.kr/user/${userId}/questions`);
  }

  console.log("");
  console.log("[okky] Starting crawl");
  console.log("[okky] Start URL:", normalizedStart);
  console.log("[okky] User ID:", userId || "not detected");
  console.log("");

  while (queue.length > 0 && visited.size < MAX_PAGES && postUrls.size < MAX_POSTS) {
    const currentUrl = queue.shift();
    const normalizedCurrent = normalizeUrl(currentUrl);

    if (!normalizedCurrent || visited.has(normalizedCurrent)) {
      continue;
    }

    visited.add(normalizedCurrent);

    try {
      console.log(`[okky] Fetching ${visited.size}/${MAX_PAGES}: ${normalizedCurrent}`);
      const html = await fetchHtml(normalizedCurrent);

      if (isLikelyPostUrl(normalizedCurrent, userId)) {
        postUrls.add(normalizedCurrent);
      }

      const links = extractLinks(html, normalizedCurrent, userId);

      for (const link of links) {
        if (visited.has(link)) continue;

        if (isLikelyPostUrl(link, userId)) {
          postUrls.add(link);
        }

        if (isLikelyListingUrl(link, userId)) {
          queue.push(link);
        }
      }
    } catch (error) {
      console.warn(`[okky] Failed to crawl ${normalizedCurrent}: ${error.message}`);
    }
  }

  const finalPostUrls = [...postUrls].slice(0, MAX_POSTS);

  console.log("");
  console.log(`[okky] Found ${finalPostUrls.length} possible post URLs`);
  console.log("");

  for (let index = 0; index < finalPostUrls.length; index += 1) {
    const postUrl = finalPostUrls[index];

    try {
      console.log(`[okky] Parsing post ${index + 1}/${finalPostUrls.length}: ${postUrl}`);
      const html = await fetchHtml(postUrl);
      const post = await parsePost(postUrl, html);
      posts.push(post);
    } catch (error) {
      console.warn(`[okky] Failed to parse post ${postUrl}: ${error.message}`);
    }
  }

  return {
    sourceUrl: normalizedStart,
    userId,
    crawledPages: visited.size,
    discoveredPosts: finalPostUrls.length,
    posts,
  };
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function getLatestPreviousPostSnapshot(snapshotData, postUrl, currentRunId) {
  const runs = snapshotData.runs || [];

  const previousRuns = runs
    .filter((run) => run.runId !== currentRunId)
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));

  for (const run of previousRuns) {
    const match = (run.posts || []).find((post) => post.url === postUrl);
    if (match) return match;
  }

  return null;
}

function calculateMetrics(snapshotData, currentRun) {
  const posts = currentRun.posts.map((post) => {
    const previous = getLatestPreviousPostSnapshot(
      snapshotData,
      post.url,
      currentRun.runId
    );

    const previousViews =
      typeof previous?.totalViews === "number" ? previous.totalViews : null;

    const currentViews =
      typeof post.totalViews === "number" ? post.totalViews : null;

    const viewsDelta =
      typeof previousViews === "number" && typeof currentViews === "number"
        ? Math.max(0, currentViews - previousViews)
        : null;

    return {
      ...post,
      previousViews,
      viewsDelta,
    };
  });

  const keywordMap = new Map();

  for (const post of posts) {
    const credit =
      typeof post.viewsDelta === "number"
        ? post.viewsDelta
        : typeof post.totalViews === "number"
          ? post.totalViews
          : 0;

    for (const keyword of post.keywords || []) {
      if (!keywordMap.has(keyword)) {
        keywordMap.set(keyword, {
          keyword,
          viewsAttributed: 0,
          postsCount: 0,
          posts: [],
        });
      }

      const item = keywordMap.get(keyword);
      item.viewsAttributed += credit;
      item.postsCount += 1;
      item.posts.push({
        title: post.title,
        url: post.url,
        credit,
      });
    }
  }

  const topKeywords = [...keywordMap.values()]
    .sort((a, b) => b.viewsAttributed - a.viewsAttributed)
    .slice(0, 30);

  const topPosts = [...posts]
    .sort((a, b) => {
      const aViews = typeof a.totalViews === "number" ? a.totalViews : -1;
      const bViews = typeof b.totalViews === "number" ? b.totalViews : -1;
      return bViews - aViews;
    })
    .slice(0, 20);

  const viewsByDate = [];

  const runs = [...(snapshotData.runs || [])].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  for (const run of runs) {
    const totalViews = (run.posts || []).reduce((sum, post) => {
      return sum + (typeof post.totalViews === "number" ? post.totalViews : 0);
    }, 0);

    const postsWithViews = (run.posts || []).filter(
      (post) => typeof post.totalViews === "number"
    ).length;

    viewsByDate.push({
      date: run.date,
      totalViews,
      postsWithViews,
      postsCount: (run.posts || []).length,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceUrl: currentRun.sourceUrl,
    userId: currentRun.userId,
    postsCount: posts.length,
    postsWithViewCount: posts.filter((post) => typeof post.totalViews === "number").length,
    viewsByDate,
    topKeywords,
    topPosts,
    posts,
    notes: [
      "First run is a baseline. Daily views require at least two runs on different dates.",
      "If totalViews is null, the current OKKY HTML did not expose a parseable view count.",
      "Keyword scores use daily view delta when available, otherwise current total views as first-run baseline.",
      "Ollama is used for keyword extraction; fallback keyword extraction is used if Ollama is unavailable.",
    ],
  };
}

function renderMarkdownReport(report) {
  const lines = [];

  lines.push("# OKKY Metrics Report");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Source URL: ${report.sourceUrl}`);
  lines.push(`User ID: ${report.userId || "not detected"}`);
  lines.push(`Posts analyzed: ${report.postsCount}`);
  lines.push(`Posts with view count: ${report.postsWithViewCount}`);
  lines.push("");

  lines.push("## Views by Date");
  lines.push("");
  lines.push("| Date | Total Views | Posts With Views | Posts Count |");
  lines.push("|---|---:|---:|---:|");

  for (const row of report.viewsByDate) {
    lines.push(
      `| ${row.date} | ${row.totalViews} | ${row.postsWithViews} | ${row.postsCount} |`
    );
  }

  lines.push("");
  lines.push("## Top Keywords");
  lines.push("");
  lines.push("| Rank | Keyword | Views Attributed | Posts Count |");
  lines.push("|---:|---|---:|---:|");

  report.topKeywords.slice(0, 20).forEach((item, index) => {
    lines.push(
      `| ${index + 1} | ${item.keyword} | ${item.viewsAttributed} | ${item.postsCount} |`
    );
  });

  lines.push("");
  lines.push("## Top Posts");
  lines.push("");
  lines.push("| Rank | Title | Total Views | Views Delta | Comments | URL |");
  lines.push("|---:|---|---:|---:|---:|---|");

  report.topPosts.slice(0, 20).forEach((post, index) => {
    const title = post.title.replace(/\|/g, " ");
    const totalViews =
      typeof post.totalViews === "number" ? String(post.totalViews) : "N/A";
    const viewsDelta =
      typeof post.viewsDelta === "number" ? String(post.viewsDelta) : "N/A";
    const comments =
      typeof post.commentsCount === "number" ? String(post.commentsCount) : "N/A";

    lines.push(
      `| ${index + 1} | ${title} | ${totalViews} | ${viewsDelta} | ${comments} | ${post.url} |`
    );
  });

  lines.push("");
  lines.push("## Notes");
  lines.push("");

  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }

  lines.push("");

  return lines.join("\n");
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const date = todayKstDate();
  const runId = `${date}-${Date.now()}`;

  const crawlResult = await crawlOkky(START_URL);

  const snapshotData = await readJsonFile(SNAPSHOT_FILE, {
    version: 1,
    runs: [],
  });

  const currentRun = {
    runId,
    date,
    startedAt: new Date().toISOString(),
    sourceUrl: crawlResult.sourceUrl,
    userId: crawlResult.userId,
    crawledPages: crawlResult.crawledPages,
    discoveredPosts: crawlResult.discoveredPosts,
    posts: crawlResult.posts,
  };

  snapshotData.runs.push(currentRun);

  snapshotData.runs = snapshotData.runs
    .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)))
    .slice(-120);

  const report = calculateMetrics(snapshotData, currentRun);
  const markdown = renderMarkdownReport(report);

  await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(snapshotData, null, 2));
  await fs.writeFile(REPORT_JSON_FILE, JSON.stringify(report, null, 2));
  await fs.writeFile(REPORT_MD_FILE, markdown);

  console.log("");
  console.log("[okky] Done.");
  console.log(`[okky] Snapshot saved: ${SNAPSHOT_FILE}`);
  console.log(`[okky] JSON report saved: ${REPORT_JSON_FILE}`);
  console.log(`[okky] Markdown report saved: ${REPORT_MD_FILE}`);
  console.log("");
  console.log("[okky] Summary:");
  console.log(`  Posts analyzed: ${report.postsCount}`);
  console.log(`  Posts with view count: ${report.postsWithViewCount}`);
  console.log(`  Top keyword: ${report.topKeywords[0]?.keyword || "N/A"}`);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("[okky] Fatal error:");
  console.error(error);
  console.error("");
  process.exit(1);
});
