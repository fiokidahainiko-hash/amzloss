/* AmzLoss SEO Intelligence — SERP Intent Analysis Engine
   For each target keyword, analyzes SERP composition from real feed data.
   Determines dominant intent, page types, content depth, entities,
   freshness, commercial signals. Prevents intent-mismatched content. */

import { ev, DATA_UNAVAILABLE } from "./seo_evidence.mjs";

export function analyzeSerpIntent({
  keyword,
  serpSnapshot = [],
  serpFeatures = [],
  topPages = []
} = {}) {
  const pageTypes = { article: 0, tool: 0, category: 0, forum: 0, video: 0, other: 0 };
  let totalWords = 0;
  let wordCountPages = 0;
  const headingPatterns = new Map();
  const entities = new Map();
  const titlePatterns = [];
  let freshnessSignals = 0;
  let commercialSignals = 0;

  for (const page of topPages) {
    if (page.type) pageTypes[page.type] = (pageTypes[page.type] || 0) + 1;
    if (page.word_count) { totalWords += page.word_count; wordCountPages++; }
    if (page.title) titlePatterns.push(page.title);
    if (page.headings) for (const h of page.headings) headingPatterns.set(h, (headingPatterns.get(h) || 0) + 1);
    if (page.entities) for (const e of page.entities) entities.set(e, (entities.get(e) || 0) + 1);
    if (page.last_modified) freshnessSignals++;
    if (page.commercial_signals) commercialSignals += page.commercial_signals;
  }

  const total = topPages.length || 1;
  const dominantType = Object.entries(pageTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || "article";
  const avgWords = wordCountPages ? Math.round(totalWords / wordCountPages) : 0;
  const topEntities = [...entities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
  const topHeadings = [...headingPatterns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);

  let dominantIntent = "informational";
  if (pageTypes.tool > total * 0.4) dominantIntent = "transactional";
  else if (pageTypes.category > total * 0.3) dominantIntent = "commercial";
  else if (commercialSignals > total * 0.5) dominantIntent = "commercial";
  else if (topPages.some(p => p.intent === "how-to")) dominantIntent = "how-to";

  const features = serpFeatures || [];
  const hasPAA = features.includes("people_also_ask");
  const hasFeaturedSnippet = features.includes("featured_snippet");
  const hasVideo = features.includes("video");

  return {
    keyword,
    dominant_intent: dominantIntent,
    dominant_page_type: dominantType,
    page_type_distribution: pageTypes,
    avg_content_depth: avgWords,
    top_entities: topEntities,
    common_headings: topHeadings,
    title_patterns: titlePatterns.slice(0, 5),
    serp_features: features,
    has_paa: hasPAA,
    has_featured_snippet: hasFeaturedSnippet,
    has_video: hasVideo,
    freshness_signal_strength: freshnessSignals / total,
    commercial_signal_strength: commercialSignals / total,
    confidence: topPages.length >= 5 ? "HIGH" : topPages.length >= 3 ? "MEDIUM" : "LOW"
  };
}

export function searchIntentMatchScore(proposedIntent, serpIntent) {
  if (!proposedIntent || !serpIntent) return 0.5;
  if (proposedIntent === serpIntent) return 1.0;
  const transactionalMatch = proposedIntent === "transactional" && serpIntent === "commercial";
  if (transactionalMatch) return 0.8;
  const commercialMatch = proposedIntent === "commercial" && serpIntent === "transactional";
  if (commercialMatch) return 0.8;
  return 0.3;
}

export function shouldCreateContent(analysis, proposedIntent) {
  const match = searchIntentMatchScore(proposedIntent, analysis.dominant_intent);
  if (match < 0.5) return { create: false, reason: `Intent mismatch: proposed ${proposedIntent}, SERP dominant ${analysis.dominant_intent} (match ${match})` };
  return { create: true, match_score: match, recommended_format: analysis.dominant_page_type };
}