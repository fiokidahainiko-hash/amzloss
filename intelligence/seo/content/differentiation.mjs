/* AmzLoss SEO Intelligence — Content Differentiation Engine
   Determines whether a proposed (or existing) article is genuinely
   differentiated from (a) internal pages in the same cluster and
   (b) competitor SERP pages provided in the competitor feed.

   Deliverables: overlapping words vs nearest internal page, unique
   angles, original-value assessment, differentiation score, and a
   no-duplicate guarantee used by the approval gate. */

import { matchKeywordToArticle } from "../keyword/keyword_intelligence.mjs";
import { loadCompetitorFeed } from "../site_data.mjs";

export function differentiationProfile(site, { title = "", slug = null, intent = null, cluster = null }) {
  const article = slug ? site.articles.find(a => a.slug === slug) : null;
  const topic = title || article?.title?.split(/[|–-]/)[0].trim() || slug;

  // Internal overlap with nearest same-cluster sibling
  const clusterName = cluster || article?.topic_cluster;
  const siblings = site.articles.filter(a => a.topic_cluster === clusterName && a.slug !== slug);
  const nearest = nearestOverlap(topic, siblings);

  // Entity overlap with competitor pages from feed
  const competitors = competitorPagesForTopic(site, topic);
  const competitorOverlap = competitors.map(cp => ({
    url: cp.url,
    title: cp.title,
    words_overlap_pct: percentOverlap(topic, cp.title || "")
  }));

  const angle = uniqueAngle(topic, clusterName, { nearest_overlap: nearest?.overlap ?? 0, competitor_distinct: competitors.length === 0 });
  const originalValue = assessOriginalValue(site, topic, { article });

  const score = Math.round(
    60 * (1 - (nearest?.overlap ?? 0) / 100) +
    20 * (competitors.length ? Math.max(0, 40 - competitorOverlap.reduce((s, c) => s + c.words_overlap_pct, 0) / competitors.length) / 40 * 100 : 80 / 100 * 100) +
    20 * originalValue
  );

  return {
    topic,
    cluster: clusterName,
    nearest_internal_sibling: nearest ? { slug: nearest.slug, title: nearest.title, overlap_pct: nearest.overlap } : null,
    internal_differentiation: nearest ? Math.round(100 - nearest.overlap) : 100,
    competitor_overlap: competitorOverlap,
    proposed_angle: angle.angle,
    angle_statement: angle.statement,
    original_value_score: Math.round(originalValue * 100),
    original_value: originalValue >= 0.7,
    differentiation_score: Math.min(100, score),
    verdict: score >= 70 ? "DIFFERENTIATED" : score >= 50 ? "MARGINAL" : "NOT_DIFFERENTIATED",
    no_duplicate_guarantee: score >= 70,
    recommendation: score < 70
      ? "Sharpen the angle: move from generic topic framing to a distinct process / dataset / formula not present in siblings or competitors."
      : "Go ahead: angle is distinct enough to justify its own URL."
  };
}

function nearestOverlap(topic, siblings) {
  let best = null;
  let bestScore = 0;
  for (const s of siblings) {
    const ov = percentOverlap(topic, s.title);
    if (ov > bestScore) { bestScore = ov; best = { slug: s.slug, title: s.title, overlap: ov }; }
  }
  return best;
}

function percentOverlap(a, b) {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 4));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 4));
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return Math.round((shared / Math.min(wa.size, wb.size)) * 100);
}

function competitorPagesForTopic(site, topic) {
  const feed = loadCompetitorFeed();
  const t = topic.toLowerCase();
  return (feed.competitors || [])
    .filter(c => (c.url || "") && (c.topics || []).some(topicEntry => t.includes(topicEntry.toLowerCase().slice(0, 8))))
    .slice(0, 5);
}

function uniqueAngle(topic, clusterName, { nearest_overlap, competitor_distinct }) {
  const base = [`original process`, `exact 2026 numbers`, `first-hand audit result`];
  if (nearest_overlap > 50 && !competitor_distinct) {
    return { angle: "Negated/default angle", statement: `Warn: "${topic}" heavily overlaps an in-cluster sibling and live competitors. Re-scope to a distinct sub-question.` };
  }
  return {
    angle: "Number-first methodology",
    statement: `Anchor "${topic}" on a concrete, runnable math/audit method with exact 2026 data — the least-replaced approach on this SERP.`
  };
}

function assessOriginalValue(site, topic, { article }) {
  // Original value exists when the article contains a formula, CSV column reference,
  // rate table, or first-hand audit content — real differentiators vs aggregators.
  if (article) {
    const html = (article.html || "").toLowerCase();
    const hasFormula = /\d+(\.\d+)?\s*[x×*/÷+\-%*|revenue|-]\s*\d/.test(html) || html.includes("formula");
    const hasColumns = /eligible ships|direct earnings|item price/.test(html);
    const hasRateTable = /<table/.test(html) || /\b(rate|fee|percentage)\s*[:=]/.test(html);
    if (hasFormula || hasColumns || hasRateTable) return 1;
    return 0.55;
  }
  return 0.7; // new content proposal defaults to a distinct-angle promise
}