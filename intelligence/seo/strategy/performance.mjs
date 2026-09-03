/* AmzLoss SEO Intelligence — Performance Feedback Loop
   Connects the engine to real performance data (traffic_feed.json —
   e.g. exported from GSC/GA4). Any page without a feed entry is
   flagged as UNMEASURED. The loop writes feedback entries through
   the memory store so past recommendations can be re-evaluated. */

import { loadTrafficFeed, articleBySlug } from "../site_data.mjs";
import { recordPerformanceFeedback, getMemory } from "../io.mjs";

function basename(url) {
  try { return new URL(url).pathname.replace(/\/$/, "").split("/").pop().replace(/\.html$/, ""); } catch (e) { return null; }
}

export function performanceSnapshot(site) {
  const feed = loadTrafficFeed();
  const pageRows = (feed.pages || []).map(p => ({
    slug: p.slug || (p.url ? basename(p.url) : null),
    url: p.url || null,
    impressions: p.impressions ?? null,
    clicks: p.clicks ?? null,
    position: p.position ?? null,
    ctr: p.ctr ?? null,
    metric_available: !!(p.impressions !== null || p.position !== null || p.slug)
  }));

  const providedMap = {};
  for (const p of pageRows) if (p.slug) providedMap[p.slug] = p;

  const measured = [];
  const unmeasured = [];
  for (const a of site.articles) {
    const row = providedMap[a.slug];
    if (row) measured.push({ slug: a.slug, title: a.title, ...row });
    else unmeasured.push({ slug: a.slug, title: a.title, status: "UNMEASURED", note: "No traffic-feed row for this page." });
  }

  return {
    feed_provided: pageRows.length > 0,
    note: pageRows.length === 0
      ? "No traffic feed provided (traffic_feed.json, e.g. exported from GSC/GA4). All pages are UNMEASURED — nothing fabricated."
      : `Traffic feed covers ${measured.length} pages.`,
    measured_pages: measured,
    unmeasured_pages: unmeasured,
    unmeasured_count: unmeasured.length,
    measured_count: measured.length,
    total_articles: site.articles.length
  };
}

export function feedbackForPage(site, slug) {
  const snap = performanceSnapshot(site);
  const a = articleBySlug(site, slug);
  const row = snap.measured_pages.find(p => p.slug === slug);
  if (!a) return { slug, available: false };

  return {
    slug,
    title: a.title,
    measured: !!row,
    metrics: row ? { impressions: row.impressions, clicks: row.clicks, position: row.position, ctr: row.ctr } : null,
    metric_available: row?.metric_available ?? false,
    action: row
      ? (row.impressions !== null && row.clicks !== null && row.impressions > 0 && row.ctr !== null && row.ctr < 0.02
          ? "Improve CTR (title/meta/rich snippets)"
          : row.position !== null && row.position > 20
          ? "Improve ranking (depth + internal links + entities)"
          : "Maintain / minor tuning")
      : "UNMEASURED — add a traffic feed row to guide this page."
  };
}

export function recordFeedback({ slug, source = "manual", value_type, value = null, note = "" }) {
  return recordPerformanceFeedback({ slug, source, value_type, value, note });
}

export function performanceFeedbackReport(site) {
  const snap = performanceSnapshot(site);
  const memory = getMemory();
  const feedbackEntries = memory.feedback_entries || [];
  return {
    snapshot: snap,
    recorded_feedback_entries: feedbackEntries.length,
    feedback_entries: feedbackEntries.slice(-10),
    summary: snap.note,
    recommended_next: snap.measured_pages.length === 0
      ? "Primary action: export real traffic data into traffic_feed.json before trusting any performance verdict."
      : "Performance loop active. Confidence: feed-based."
  };
}